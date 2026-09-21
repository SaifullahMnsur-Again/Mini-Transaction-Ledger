using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Backend.Enums;

namespace Backend.Models;

public class Account
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string AccountNumber { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    public AccountType Type { get; set; }
    
    [MaxLength(3)]
    public string Currency { get; set; } = "BDT";
    
    public DateTime CreatedAtUtc {get; set;} = DateTime.UtcNow;
    
    [JsonIgnore]
    public List<LedgerSplit> Splits { get; set; } = [];
}