using Backend.DataAccess;
using Backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Text;
using Serilog;
using Microsoft.Extensions.Hosting;
using Backend.Helpers;
using Dapper;
using Microsoft.OpenApi.Models;


var builder = WebApplication.CreateBuilder(args);
var configuration = builder.Configuration;
GlobalConfig.Initialize(configuration);

// Register the GUID Type Handler for Dapper
SqlMapper.AddTypeHandler(new GuidTypeHandler());

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/app-log.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Debugging: Print all environment variables
if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
{
    var allVariables = Environment.GetEnvironmentVariables();
    foreach (var key in allVariables.Keys)
    {
        Console.WriteLine($"{key}={allVariables[key]}");
    }
}
// Load the SMTP configuration from environment variables
var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
if (string.IsNullOrEmpty(smtpPassword) && builder.Environment.IsProduction())
{
    throw new InvalidOperationException("SMTP password not configured in environment variables.");
}

if (builder.Environment.IsDevelopment())
{
    Console.WriteLine("Running in development mode, skipping email setup.");
}
else
{
    Console.WriteLine("SMTP password loaded successfully.");
}

// Load the JWT secret key from environment variables
var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT secret key not configured in environment variables.");
}


var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

// Add services to the container.
builder.Services.AddScoped<SqlExecutor>(); // Inject SqlExecutor
builder.Services.AddScoped<UserServices>(); // Inject UserServices

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
            builder.WithOrigins("https://www.ebudget.se") // Production frontend URL
                   .AllowAnyHeader()
                   .AllowAnyMethod()
                   .AllowCredentials(); // Corrected syntax
        });
});

// Add Swagger and API explorer
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
// Enable static file serving
app.UseStaticFiles();
app.UseRouting();



// Enable Swagger for both Development and Production
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = "api-docs"; // Swagger will be available at /api-docs
        c.DisplayRequestDuration(); // Displays request duration in Swagger UI
    });
}

// Apply the correct CORS policy based on environment
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentCorsPolicy"); // Development CORS
}
else
{
    app.UseCors("ProductionCorsPolicy"); // Production CORS
}
Console.WriteLine($"Current environment: {app.Environment.EnvironmentName}");
// Keep HTTPS redirection enabled for secure communication
app.UseHttpsRedirection();

// Fallback to React for unknown routes
app.MapFallbackToFile("index.html"); // This ensures React handles its own routes

// Enable authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

