namespace Backend.DTOs;

public record TransactionResponseDto(
    Guid Id,
    string ReferenceId,
    string Description,
    DateTime PostedAtUtc,
    List<LedgerSplitDto> Splits
    );