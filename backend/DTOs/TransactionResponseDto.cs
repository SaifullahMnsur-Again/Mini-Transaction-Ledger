namespace Backend.DTOs;

public record TransactionResponseDto(
    Guid Id,
    string TransactionId,
    string Description,
    DateTime PostedAtUtc,
    List<LedgerSplitDto> Splits
    );