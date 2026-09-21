using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public record CreateTransactionRequest(
    [MaxLength(500)] string Description,
    [Required, MinLength(2, ErrorMessage = "A transaction must contain at least two splits.")]
    List<CreateLedgerSplitRequest> Splits
    );