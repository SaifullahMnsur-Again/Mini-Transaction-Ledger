using Backend.Data;
using Backend.DTOs;
using Backend.Enums;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class TransactionService(LedgerDbContext db) : ITransactionService
{
    public async Task<TransactionResponseDto> PostTransactionAsync(CreateTransactionRequest request, CancellationToken ct = default)
    {
        // 1. Structural Validations
        if (request.Splits == null || request.Splits.Count < 2)
        {
            throw new InvalidOperationException("A transaction must contain at least two splits (double-entry requirement).");
        }

        if (request.Splits.Any(s => s.Amount <= 0))
        {
            throw new InvalidOperationException("Split amount must be greater than zero.");
        }

        // 2. Validate Double-Entry Equilibrium: Sum(Debit) == Sum(Credit)
        var totalDebit = request.Splits
            .Where(s => s.Type == EntryType.Debit)
            .Sum(s => s.Amount);

        var totalCredit = request.Splits
            .Where(s => s.Type == EntryType.Credit)
            .Sum(s => s.Amount);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException(
                $"Transaction is unbalanced. Total Debit: {totalDebit:F4}, Total Credit: {totalCredit:F4}. Difference: {Math.Abs(totalDebit - totalCredit):F4}.");
        }

        var normalizedRef = request.ReferenceId.Trim();

        // 3. Single Batch Query for all distinct accounts and their current balances (O(1) round-trip)
        var distinctAccountIds = request.Splits
            .Select(s => s.AccountId)
            .Distinct()
            .ToList();

        var accountsMap = await db.Accounts
            .AsNoTracking()
            .Where(a => distinctAccountIds.Contains(a.Id))
            .Select(a => new
            {
                a.Id,
                a.AccountNumber,
                a.Name,
                a.Type,
                // Correlated subquery translated to SQL to fetch latest balance in the same round-trip
                CurrentBalance = db.LedgerSplits
                    .Where(s => s.AccountId == a.Id)
                    .OrderByDescending(s => s.Id)
                    .Select(s => s.RunningBalanceAfter)
                    .FirstOrDefault()
            })
            .ToDictionaryAsync(a => a.Id, ct);

        // Verify all required accounts exist
        foreach (var splitReq in request.Splits)
        {
            if (!accountsMap.ContainsKey(splitReq.AccountId))
            {
                throw new InvalidOperationException($"Account with ID '{splitReq.AccountId}' was not found.");
            }
        }

        // 4. Atomic Execution inside isolated DB transaction
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var existing = await db.JournalEntries
                .AsNoTracking()
                .AnyAsync(j => j.ReferenceId == normalizedRef, ct);

            if (existing)
            {
                throw new InvalidOperationException($"A transaction with ReferenceId '{request.ReferenceId}' has already been processed.");
            }

            var journalEntry = new JournalEntry
            {
                ReferenceId = normalizedRef,
                Description = request.Description?.Trim() ?? string.Empty,
                PostedAtUtc = DateTime.UtcNow
            };

            // In-memory balance tracking across legs within the transaction
            var runningBalances = accountsMap.ToDictionary(k => k.Key, v => v.Value.CurrentBalance);
            var splitResponses = new List<LedgerSplitDto>();

            foreach (var splitReq in request.Splits)
            {
                var account = accountsMap[splitReq.AccountId];
                var priorBalance = runningBalances[account.Id];

                // Debit-Normal (Asset=1, Expense=5): Debit adds, Credit subtracts
                // Credit-Normal (Liability=2, Equity=3, Revenue=4): Credit adds, Debit subtracts
                var isDebitNormal = account.Type is AccountType.Asset or AccountType.Expense;

                decimal newRunningBalance;
                if (isDebitNormal)
                {
                    newRunningBalance = splitReq.Type == EntryType.Debit
                        ? priorBalance + splitReq.Amount
                        : priorBalance - splitReq.Amount;
                }
                else
                {
                    newRunningBalance = splitReq.Type == EntryType.Credit
                        ? priorBalance + splitReq.Amount
                        : priorBalance - splitReq.Amount;
                }

                runningBalances[account.Id] = newRunningBalance;

                var split = new LedgerSplit
                {
                    JournalEntry = journalEntry,
                    AccountId = account.Id,
                    Type = splitReq.Type,
                    Amount = splitReq.Amount,
                    RunningBalanceAfter = newRunningBalance
                };

                journalEntry.Splits.Add(split);

                splitResponses.Add(new LedgerSplitDto(
                    account.Id,
                    account.AccountNumber,
                    account.Name,
                    split.Type,
                    split.Amount,
                    split.RunningBalanceAfter
                ));
            }

            db.JournalEntries.Add(journalEntry);
            await db.SaveChangesAsync(ct);

            await tx.CommitAsync(ct);

            return new TransactionResponseDto(
                journalEntry.Id,
                journalEntry.ReferenceId,
                journalEntry.Description,
                journalEntry.PostedAtUtc,
                splitResponses
            );
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<TransactionResponseDto?> GetTransactionByReferenceAsync(string referenceId, CancellationToken ct = default)
    {
        var normalizedRef = referenceId.Trim();
        var entry = await db.JournalEntries
            .AsNoTracking()
            .Include(j => j.Splits)
                .ThenInclude(s => s.Account)
            .FirstOrDefaultAsync(j => j.ReferenceId == normalizedRef, ct);

        if (entry == null) return null;

        return new TransactionResponseDto(
            entry.Id,
            entry.ReferenceId,
            entry.Description,
            entry.PostedAtUtc,
            entry.Splits.Select(s => new LedgerSplitDto(
                s.AccountId,
                s.Account?.AccountNumber ?? string.Empty,
                s.Account?.Name ?? string.Empty,
                s.Type,
                s.Amount,
                s.RunningBalanceAfter
            )).ToList()
        );
    }

    public async Task<IEnumerable<TransactionResponseDto>> GetAllTransactionsAsync(CancellationToken ct = default)
    {
        var entries = await db.JournalEntries
            .AsNoTracking()
            .Include(j => j.Splits)
                .ThenInclude(s => s.Account)
            .OrderByDescending(j => j.PostedAtUtc)
            .ToListAsync(ct);

        return entries.Select(entry => new TransactionResponseDto(
            entry.Id,
            entry.ReferenceId,
            entry.Description,
            entry.PostedAtUtc,
            entry.Splits.Select(s => new LedgerSplitDto(
                s.AccountId,
                s.Account?.AccountNumber ?? string.Empty,
                s.Account?.Name ?? string.Empty,
                s.Type,
                s.Amount,
                s.RunningBalanceAfter
            )).ToList()
        ));
    }
}