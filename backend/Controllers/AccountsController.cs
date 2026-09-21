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
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var result = await accountService.CreateAccountAsync(request, ct);
            return CreatedAtAction(nameof(GetAccountById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(new {error = e.Message});
        }
    }
    
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AccountDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllAccounts(CancellationToken ct)
    {
        var accounts = await accountService.GetAllAccountsAsync(ct);
        return Ok(accounts);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AccountDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAccountById([FromRoute] Guid id, CancellationToken ct = default)
    {
        var account = await accountService.GetAccountByIdAsync(id, ct);
        if (account is null)
        {
            return NotFound(new { error = $"Account with ID '{id}' was not found." });
        }
        return Ok(account);
    }
    
    [HttpGet("{id:guid}/statement")]
    [ProducesResponseType(typeof(AccountStatementDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAccountStatement(
        [FromRoute] Guid id,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        CancellationToken ct = default)
    {
        var statement = await accountService.GetAccountStatementAsync(id, fromUtc, toUtc, ct);
        if (statement is null)
        {
            return NotFound(new { error = $"Account with ID '{id}' was not found." });
        }

        return Ok(statement);
    }
}