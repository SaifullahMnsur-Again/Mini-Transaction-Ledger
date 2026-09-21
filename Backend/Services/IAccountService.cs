using Backend.DTOs;

namespace Backend.Services;

public interface IAccountService
{
    Task<AccountDto> CreateAccountAsync(CreateAccountRequest request,  CancellationToken ct = default);
    Task<IEnumerable<AccountDto>> GetAllAccountsAsync(CancellationToken ct = default);
    Task<AccountDto?> GetAccountByIdAsync(Guid id, CancellationToken ct = default);
    Task<AccountStatementDto?> GetAccountStatementAsync(
        Guid accountId, 
        DateTime? fromUtc, 
        DateTime? toUtc, 
        CancellationToken ct = default);
}