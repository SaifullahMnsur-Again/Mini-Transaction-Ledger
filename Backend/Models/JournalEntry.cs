using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class JournalEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string ReferenceId { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Description {get; set;} = string.Empty;
    
    public DateTime PostedAtUtc { get; set; } = DateTime.UtcNow;

    public List<LedgerSplit> Splits { get; set; } = [];
}