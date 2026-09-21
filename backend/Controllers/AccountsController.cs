using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AccountsController(IAccountService accountService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateAccountRequest request, CancellationToken ct)
    {
        try
        {
            var result = await accountService.CreateAccountAsync(request, ct);
            return CreatedAtAction(nameof(GetByNumber), new { accountNumber = result.AccountNumber }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var results = await accountService.GetAllAccountsAsync(ct);
        return Ok(results);
    }

    [HttpGet("{accountNumber}")]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByNumber(string accountNumber, CancellationToken ct)
    {
        var result = await accountService.GetAccountByNumberAsync(accountNumber, ct);
        if (result == null)
        {
            return NotFound(new { error = $"Account '{accountNumber}' not found." });
        }

        return Ok(result);
    }

    [HttpGet("{accountNumber}/statement")]
    [ProducesResponseType(typeof(AccountStatementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetStatement(
        string accountNumber,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        CancellationToken ct)
    {
        var statement = await accountService.GetAccountStatementByNumberAsync(accountNumber, fromUtc, toUtc, ct);
        if (statement == null)
        {
            return NotFound(new { error = $"Account '{accountNumber}' not found." });
        }

        return Ok(statement);
    }
}