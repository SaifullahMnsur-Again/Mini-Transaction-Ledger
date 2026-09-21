using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.DTOs;

public record TransactionResponseDto(
    Guid Id,
    string TransactionId,
    string Description,
    DateTime PostedAtUtc,
    List<LedgerSplitDto> Splits
    );

public record CreateTransactionRequest(
    [MaxLength(500)] string Description,
    [Required, MinLength(2, ErrorMessage = "A transaction must contain at least two splits.")]
    List<CreateLedgerSplitRequest> Splits
    );

public record LedgerSplitDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    EntryType Type,
    decimal Amount,
    decimal RunningBalanceAfter
    );

public class CreateLedgerSplitRequest
{
    [Required] public Guid AccountId { get; set; }

    [Required] public EntryType Type { get; set; }

    [Required]
    [Range(0.0001, double.MaxValue, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }
};