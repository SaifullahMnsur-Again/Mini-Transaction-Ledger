using Backend.DTOs;

namespace Backend.Services;

public interface ITransactionService
{
    Task<TransactionResponseDto> PostTransactionAsync(CreateTransactionRequest request, CancellationToken ct = default);
    Task<TransactionResponseDto?> GetTransactionByReferenceAsync(string referenceId, CancellationToken ct = default);
    Task<IEnumerable<TransactionResponseDto>> GetAllTransactionsAsync(CancellationToken ct = default);
}