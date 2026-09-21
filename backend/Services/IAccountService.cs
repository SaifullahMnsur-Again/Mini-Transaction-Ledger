using Backend.DTOs;

namespace Backend.Services;

public interface IAccountService
{
    Task<AccountDto> CreateAccountAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task<IEnumerable<AccountDto>> GetAllAccountsAsync(CancellationToken ct = default);
    Task<AccountDto?> GetAccountByNumberAsync(string accountNumber, CancellationToken ct = default);
    Task<AccountStatementDto?> GetAccountStatementByNumberAsync(string accountNumber, DateTime? fromUtc, DateTime? toUtc, CancellationToken ct = default);
}