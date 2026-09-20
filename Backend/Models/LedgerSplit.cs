using System.Text.Json.Serialization;
using Backend.Enums;

namespace Backend.Models;

public class LedgerSplit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid JournalEntryId { get; set; }
    
    [JsonIgnore]
    public JournalEntry?  JournalEntry { get; set; }
    
    public Guid AccountId { get; set; }
    public Account? Account { get; set; }
    
    public EntryType Type { get; set; }
    public decimal Amount { get; set; }
    public decimal RunningBalanceAfter { get; set; }
}