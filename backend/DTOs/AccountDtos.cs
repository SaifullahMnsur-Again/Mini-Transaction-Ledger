using System.ComponentModel.DataAnnotations;
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

public record CreateAccountRequest(
    [Required] string AccountNumber,

    [Required] string Name,

    [Required] AccountType Type,

    string Currency = "BDT"
);