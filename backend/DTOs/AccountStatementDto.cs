using Backend.Enums;

namespace Backend.DTOs;

public record AccountStatementQuery(
    DateTime? FromUtc,
    DateTime? ToUtc
);

public record StatementLineItemDto(
    Guid TransactionId,
    string ReferenceId,
    string Description,
    DateTime PostedAtUtc,
    EntryType EntryType,
    decimal Amount,
    decimal RunningBalanceAfter
);

public record AccountStatementDto(
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    AccountType AccountType,
    string Currency,
    DateTime FromUtc,
    DateTime ToUtc,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal ClosingBalance,
    List<StatementLineItemDto> Entries
);