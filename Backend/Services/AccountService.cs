using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using Backend.Enums;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public class AccountService(LedgerDbContext db) : IAccountService
{
    public async Task<AccountDto> CreateAccountAsync(CreateAccountRequest request, CancellationToken ct = default)
    {
        var normalizedNumber = request.AccountNumber.Trim().ToUpperInvariant();
        var exists = await db.Accounts.AnyAsync(a => a.AccountNumber == normalizedNumber, ct);

        if (exists)
        {
            throw new InvalidOperationException($"Account '{request.AccountNumber} already exists.");
        }

        var account = new Account
        {
            AccountNumber = normalizedNumber,
            Name = request.Name.Trim(),
            Type = request.Type,
            Currency = request.Currency.Trim().ToUpperInvariant(),
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        return new AccountDto(
            account.Id,
            account.AccountNumber,
            account.Name,
            account.Type,
            account.Currency,
            0.00m,
            account.CreatedAtUtc
        );
    }

    public async Task<IEnumerable<AccountDto>> GetAllAccountsAsync(CancellationToken ct = default)
    {
        var accounts = await db.Accounts
            .AsNoTracking()
            .Include(a => a.Splits)
            .OrderBy(a => a.AccountNumber)
            .ToListAsync(ct);

        return accounts.Select(MapToDto);
    }

    
    public async Task<AccountDto?> GetAccountByIdAsync(Guid id, CancellationToken ct = default)
    {
        var account = await db.Accounts
            .AsNoTracking()
            .Include(a => a.Splits)
            .FirstOrDefaultAsync(a => a.Id == id, ct);
        
        return account is not null ?  MapToDto(account) : null;
    }
    
    private static  AccountDto MapToDto(Account a)
    {
        var latestBalance = a.Splits?
            .OrderByDescending(s => s.Id)
            .Select(s => s.RunningBalanceAfter)
            .FirstOrDefault() ?? 0.00m;

        return new AccountDto(
            a.Id,
            a.AccountNumber,
            a.Name,
            a.Type,
            a.Currency,
            latestBalance,
            a.CreatedAtUtc
            );
    }
    
    public async Task<AccountStatementDto?> GetAccountStatementAsync(
    Guid accountId,
    DateTime? fromUtc,
    DateTime? toUtc,
    CancellationToken ct = default)
    {
        var account = await db.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account == null) return null;

        var start = fromUtc ?? DateTime.MinValue.ToUniversalTime();
        var end = toUtc ?? DateTime.UtcNow;

        // 1. Calculate Opening Balance: the balance after the latest split prior to start
        var openingBalance = await db.LedgerSplits
            .AsNoTracking()
            .Where(s => s.AccountId == accountId && s.JournalEntry!.PostedAtUtc < start)
            .OrderByDescending(s => s.JournalEntry!.PostedAtUtc)
            .ThenByDescending(s => s.Id)
            .Select(s => s.RunningBalanceAfter)
            .FirstOrDefaultAsync(ct);

        // 2. Fetch all splits in [start, end] window, ordered chronologically
        var periodSplits = await db.LedgerSplits
            .AsNoTracking()
            .Where(s => s.AccountId == accountId 
                        && s.JournalEntry!.PostedAtUtc >= start 
                        && s.JournalEntry!.PostedAtUtc <= end)
            .OrderBy(s => s.JournalEntry!.PostedAtUtc)
            .ThenBy(s => s.Id)
            .Select(s => new StatementLineItemDto(
                s.JournalEntry!.Id,
                s.JournalEntry!.ReferenceId,
                s.JournalEntry!.Description,
                s.JournalEntry!.PostedAtUtc,
                s.Type,
                s.Amount,
                s.RunningBalanceAfter
            ))
            .ToListAsync(ct);

        var totalDebit = periodSplits
            .Where(s => s.EntryType == EntryType.Debit)
            .Sum(s => s.Amount);

        var totalCredit = periodSplits
            .Where(s => s.EntryType == EntryType.Credit)
            .Sum(s => s.Amount);

        // 3. Determine Closing Balance: last split in period, or opening balance if no activity
        var closingBalance = periodSplits.Count > 0
            ? periodSplits.Last().RunningBalanceAfter
            : openingBalance;

        return new AccountStatementDto(
            account.Id,
            account.AccountNumber,
            account.Name,
            account.Type,
            account.Currency,
            start,
            end,
            openingBalance,
            totalDebit,
            totalCredit,
            closingBalance,
            periodSplits
        );
    }
}