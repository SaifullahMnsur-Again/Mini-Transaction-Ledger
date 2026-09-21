using System.ComponentModel.DataAnnotations;
using Backend.Enums;

namespace Backend.DTOs;

public record CreateAccountRequest(
    [Required] string AccountNumber,

    [Required] string Name,

    [Required] AccountType Type,

    string Currency = "BDT"
);