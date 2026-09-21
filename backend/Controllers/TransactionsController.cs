using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class TransactionsController(ITransactionService transactionService): ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(TransactionResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PostTransaction([FromBody] CreateTransactionRequest request, CancellationToken ct)
    {
        try
        {
            var result = await transactionService.PostTransactionAsync(request, ct);
            return CreatedAtAction(nameof(GetByReference), new { referenceId = result.ReferenceId }, result);
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(new {error = e.Message});
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TransactionResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var results = await transactionService.GetAllTransactionsAsync(ct);
        return Ok(results);
    }

    [HttpGet("{referenceId}")]
    [ProducesResponseType(typeof(TransactionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByReference(string referenceId, CancellationToken ct)
    {
        var result = await transactionService.GetTransactionByReferenceAsync(referenceId, ct);
        return result is not null ? Ok(result) : NotFound(new {error = $"Transaction '{{referenceId}}' not found."});
    }
}