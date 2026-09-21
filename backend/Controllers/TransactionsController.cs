using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class TransactionsController(ITransactionService transactionService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(TransactionResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> PostTransaction([FromBody] CreateTransactionRequest request, CancellationToken ct)
    {
        try
        {
            var result = await transactionService.PostTransactionAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { transactionId = result.TransactionId }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TransactionResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var results = await transactionService.GetAllTransactionsAsync(ct);
        return Ok(results);
    }

    [HttpGet("{transactionId}")]
    [ProducesResponseType(typeof(TransactionResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string transactionId, CancellationToken ct)
    {
        var result = await transactionService.GetTransactionByTxIdAsync(transactionId, ct);
        if (result == null)
        {
            return NotFound(new { error = $"Transaction '{transactionId}' not found." });
        }

        return Ok(result);
    }
}