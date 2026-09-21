using Backend.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/v1/metadata")]
public class MetadataController : ControllerBase
{
    [HttpGet("account-types")]
    public IActionResult GetAccountTypes()
    {
        var types = Enum.GetValues<AccountType>()
            .Select(t => new
            {
                Id = (int)t,
                Name = t.ToString(),
                NormalBalance = (t == AccountType.Asset || t == AccountType.Expense) ? "Debit" : "Credit"
            });

        return Ok(types);
    }

    [HttpGet("entry-types")]
    public IActionResult GetEntryTypes()
    {
        var types = Enum.GetValues<EntryType>()
            .Select(t => new
            {
                Id = (int)t,
                Name = t.ToString(),
                Description = t == EntryType.Debit 
                    ? "Increases Asset/Expense; decreases Liability/Equity/Revenue" 
                    : "Increases Liability/Equity/Revenue; decreases Asset/Expense"
            });

        return Ok(types);
    }
}