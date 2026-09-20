using Backend.Enums;

namespace Backend.DTOs;

public record AccountDto(
    Guid Id,
    string AccountNumber,
    string Name,
    AccountType Type,
    string Currency,
    decimal CurrentBalance,
    DateTime CreatedAtUtc
);