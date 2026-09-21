using System.Security.Cryptography;
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

        // 3. Batch Query for accounts and current running balances
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
                CurrentBalance = db.LedgerSplits
                    .Where(s => s.AccountId == a.Id)
                    .OrderByDescending(s => s.Id)
                    .Select(s => s.RunningBalanceAfter)
                    .FirstOrDefault()
            })
            .ToDictionaryAsync(a => a.Id, ct);

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
            // Server generates unique TransactionId (no frontend input, no collisions)
            var generatedTxId = GenerateTransactionId();

            var journalEntry = new JournalEntry
            {
                TransactionId = generatedTxId,
                Description = request.Description?.Trim() ?? string.Empty,
                PostedAtUtc = DateTime.UtcNow
            };

            var runningBalances = accountsMap.ToDictionary(k => k.Key, v => v.Value.CurrentBalance);
            var splitResponses = new List<LedgerSplitDto>();

            foreach (var splitReq in request.Splits)
            {
                var account = accountsMap[splitReq.AccountId];
                var priorBalance = runningBalances[account.Id];

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
                journalEntry.TransactionId,
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

    public async Task<TransactionResponseDto?> GetTransactionByIdAsync(string transactionId, CancellationToken ct = default)
    {
        var normalized = transactionId.Trim();
        JournalEntry? entry = null;

        // Support matching either by Guid or by the generated TransactionId (e.g. TX-20260921-...)
        if (Guid.TryParse(normalized, out var guidId))
        {
            entry = await db.JournalEntries
                .AsNoTracking()
                .Include(j => j.Splits)
                    .ThenInclude(s => s.Account)
                .FirstOrDefaultAsync(j => j.Id == guidId, ct);
        }

        if (entry == null)
        {
            entry = await db.JournalEntries
                .AsNoTracking()
                .Include(j => j.Splits)
                    .ThenInclude(s => s.Account)
                .FirstOrDefaultAsync(j => j.TransactionId == normalized, ct);
        }

        if (entry == null) return null;

        return new TransactionResponseDto(
            entry.Id,
            entry.TransactionId,
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
            entry.TransactionId,
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

    private static string GenerateTransactionId()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(3);
        return $"TX-{Convert.ToHexString(randomBytes)}";
    }
}