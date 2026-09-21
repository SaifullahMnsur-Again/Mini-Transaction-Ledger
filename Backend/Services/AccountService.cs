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
}