using Backend.Data;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

DotNetEnv.Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new()
    {
        Title = "Mini Transaction Ledger API",
        Version = "v1",
        Description = "REST API for managing accounts and transactions"
    });
});

builder.Services.AddOpenApi();

var connectionString = builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? throw new InvalidOperationException("Connecting string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<LedgerDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    
    app.MapScalarApiReference(); 
    
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();


try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
    db.Database.Migrate();
}
catch (Exception e)
{
    var logger = app.Logger;
    logger.LogError(e, "An error occured during migration or creating the database. Need to make sure if Database is running!");
}

app.Run();