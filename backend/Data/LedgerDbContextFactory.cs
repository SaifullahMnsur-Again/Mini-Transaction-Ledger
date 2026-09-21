using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.Data;

public class LedgerDbContextFactory: IDesignTimeDbContextFactory<LedgerDbContext>
{
    public LedgerDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
        
        var connectingString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;port:5439;Database=ledger_db;Username=postgres;Password=postgres";

        var optionsBuilder = new DbContextOptionsBuilder<LedgerDbContext>();
        optionsBuilder.UseNpgsql(connectingString);
        
        return new LedgerDbContext(optionsBuilder.Options);
    }
}