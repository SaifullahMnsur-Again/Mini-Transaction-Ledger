using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class LedgerDbContext(DbContextOptions<LedgerDbContext> options) : DbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<LedgerSplit> LedgerSplits  => Set<LedgerSplit>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasIndex(a => a.AccountNumber).IsUnique();
        });
        modelBuilder.Entity<JournalEntry>(entity =>
        {
            entity.HasIndex(j => j.ReferenceId).IsUnique();
        });
        modelBuilder.Entity<LedgerSplit>(entity =>
        {
            entity.Property(s => s.Amount).HasColumnType("decimal(18,4");
            entity.Property(s => s.RunningBalanceAfter).HasColumnType("decimal(18,4");
        });
    }
}