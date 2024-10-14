using Backend.DataAccess;
using Backend.Helpers;
using Backend.Services;
using Dapper;
using Microsoft.Extensions.Logging;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Add logging services
builder.Logging.ClearProviders(); // Remove default logging providers
builder.Logging.AddSerilog(); // Use Serilog as the logger

var configuration = builder.Configuration;
GlobalConfig.Initialize(configuration);

// Register the GUID Type Handler for Dapper
SqlMapper.AddTypeHandler(new GuidTypeHandler());

// Configure Serilog
var logFilePath = builder.Environment.IsProduction()
    ? "/var/www/backend/logs/app-log.txt"
    : "logs/app-log.txt"; // Default to this path for test and dev environments

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(logFilePath, rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();
Log.Information($"Log file path: {logFilePath}");

var app = builder.Build();

ILogger<Program> _logger = app.Services.GetRequiredService<ILogger<Program>>();

// Log environment information
_logger.LogInformation("Application starting in environment: {Env}", builder.Environment.EnvironmentName);

// Debugging: Print all environment variables (remove or limit this in production)
if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
{
    var allVariables = Environment.GetEnvironmentVariables();
    foreach (var key in allVariables.Keys)
    {
        _logger.LogInformation($"{key} = {allVariables[key]}");
    }
}

// Load the SMTP configuration from environment variables
var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
if (string.IsNullOrEmpty(smtpPassword) && builder.Environment.IsProduction())
{
    _logger.LogError("SMTP password not configured in environment variables.");
    throw new InvalidOperationException("SMTP password not configured.");
}

if (builder.Environment.IsDevelopment())
{
    _logger.LogInformation("Running in development mode, skipping email setup.");
}
else
{
    _logger.LogInformation("SMTP password loaded successfully.");
}

// Add JWT secret key logging
var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrEmpty(jwtKey))
{
    _logger.LogError("JWT secret key not configured in environment variables.");
    throw new InvalidOperationException("JWT secret key not configured.");
}
else
{
    _logger.LogInformation("JWT secret key loaded successfully.");
}

// Swagger setup logs
_logger.LogInformation("Configuring Swagger...");
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    _logger.LogInformation("Enabling Swagger for environment: {Env}", app.Environment.EnvironmentName);

    app.UseSwagger();
    _logger.LogInformation("Swagger JSON endpoint enabled.");

    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = "api-docs"; // Make Swagger UI available at /api-docs
        c.DisplayRequestDuration();
        _logger.LogInformation("Swagger UI enabled at /api-docs.");
    });
}
else
{
    _logger.LogWarning("Swagger not enabled for the current environment: {Env}", app.Environment.EnvironmentName);
}

// Add services to the container.
builder.Services.AddScoped<SqlExecutor>(); // Inject SqlExecutor
builder.Services.AddScoped<UserServices>(); // Inject UserServices
builder.Services.AddScoped<TokenService>(); // Inject TokenService

// Configure EmailService based on environment
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEmailService, MockEmailService>();
}
else
{
    builder.Services.AddSingleton<IEmailService, EmailService>();
}

// Adding CORS policies
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCorsPolicy",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000") // Local frontend URL
                   .AllowAnyHeader()
                   .AllowAnyMethod()
                   .AllowCredentials();
        });

    options.AddPolicy("ProductionCorsPolicy",
        builder =>
        {
            builder.WithOrigins("https://www.ebudget.se", "https://ebudget.se")
                   .AllowAnyHeader()
                   .AllowAnyMethod()
                   .AllowCredentials();
        });
});

// Log CORS policy
if (app.Environment.IsDevelopment())
{
    _logger.LogInformation("Applying Development CORS policy.");
    app.UseCors("DevelopmentCorsPolicy");
}
else
{
    _logger.LogInformation("Applying Production CORS policy.");
    app.UseCors("ProductionCorsPolicy");
}

// Continue with your regular setup (static files, routes, etc.)
app.UseExceptionHandler("/error"); // Global exception handling
app.UseStaticFiles();
app.UseRouting();

// HTTPS redirection and fallback
app.UseHttpsRedirection();
app.MapFallbackToFile("index.html"); // Ensure React handles routes
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

_logger.LogInformation("Application setup complete. Running app...");
app.Run();
