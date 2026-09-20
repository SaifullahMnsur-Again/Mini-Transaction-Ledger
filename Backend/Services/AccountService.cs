using Backend.Data;
using Backend.Models;
using Backend.DTOs;
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
        return await db.Accounts
            .AsNoTracking()
            .Select(a => new AccountDto(
                a.Id,
                a.AccountNumber,
                a.Name,
                a.Type,
                a.Currency,
                a.Splits.OrderByDescending(s => s.JournalEntry!.PostedAtUtc)
                    .Select(s => s.RunningBalanceAfter)
                    .FirstOrDefault(),
                a.CreatedAtUtc
            ))
            .ToListAsync(ct);
    }

    public async Task<AccountDto?> GetAccountByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await db.Accounts
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new AccountDto(
                a.Id,
                a.AccountNumber,
                a.Name,
                a.Type,
                a.Currency,
                a.Splits.OrderByDescending(s => s.JournalEntry!.PostedAtUtc)
                    .Select(s => s.RunningBalanceAfter)
                    .FirstOrDefault(),
                a.CreatedAtUtc
            ))
            .FirstOrDefaultAsync(ct);
    }
}