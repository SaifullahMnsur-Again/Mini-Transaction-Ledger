using Backend.DTOs;

namespace Backend.Services;

public interface ITransactionService
{
    Task<TransactionResponseDto> PostTransactionAsync(CreateTransactionRequest request, CancellationToken ct = default);
    Task<TransactionResponseDto?> GetTransactionByIdAsync(string transactionId, CancellationToken ct = default);
    Task<IEnumerable<TransactionResponseDto>> GetAllTransactionsAsync(CancellationToken ct = default);
}