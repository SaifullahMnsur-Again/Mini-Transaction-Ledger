using Backend.Data;
using Backend.Services;
using Microsoft.EntityFrameworkCore;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// 1. Controller & Swagger Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Mini Transaction Ledger API",
        Version = "v1",
        Description = "REST API for managing accounts, double-entry transactions, and running balances."
    });
});

builder.Services.AddHealthChecks();

// 2. Database Connection
var connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<LedgerDbContext>(options =>
    options.UseNpgsql(connectionString));

// 3. Application Services
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();

// 4. CORS Policy for Frontend Interaction
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 5. Middleware Pipeline
// Enabled for both Development and Docker environments so evaluators can use Swagger UI
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Docker"))
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Mini Transaction Ledger API v1");
    });
}

// CORS must be called before Authorization and MapControllers
app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.MapHealthChecks("/health");

// 6. Automatic Database Migration on Startup
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
    db.Database.Migrate();
}
catch (Exception ex)
{
    var logger = app.Logger;
    logger.LogError(ex, "An error occurred during database migration. Verify that the PostgreSQL instance is running and reachable.");
}

app.Run();