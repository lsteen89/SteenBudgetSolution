using Backend.DataAccess;
using Backend.Helpers;
using Backend.Services;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog early in the application lifecycle
var logFilePath = builder.Environment.IsProduction()
    ? "/var/www/backend/logs/app-log.txt"
    : "logs/app-log.txt";  // Default to this path for test and dev environments

// Initialize Serilog and set up logging before anything else
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File(logFilePath, rollingInterval: RollingInterval.Day)
    .CreateLogger();

// Log the file path after Serilog is initialized
Log.Information($"Log file path: {logFilePath}");

// Set Serilog as the logging provider
builder.Host.UseSerilog();

// Continue configuring services and the rest of the application
var configuration = builder.Configuration;
GlobalConfig.Initialize(configuration);

// Register the GUID Type Handler for Dapper
SqlMapper.AddTypeHandler(new GuidTypeHandler());

// Add services to the container
builder.Services.AddScoped<SqlExecutor>();  // Inject SqlExecutor
builder.Services.AddScoped<UserServices>();  // Inject UserServices
builder.Services.AddScoped<TokenService>();  // Inject TokenService

// Register Swagger services
builder.Services.AddSwaggerGen();

// Add controller services to support routing to your controllers
builder.Services.AddControllers();  // <-- Required for app.MapControllers() to work

// Configure EmailService based on environment
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEmailService, MockEmailService>();
}
else
{
    builder.Services.AddSingleton<IEmailService, EmailService>();
}

// Adding Authentication and Authorization
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwtKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? "development-fallback-key";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero  // Token expiration tolerance
    };
});

builder.Services.AddAuthorization();  // Required to resolve the error

// Adding CORS policies
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCorsPolicy",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000")  // Local frontend URL
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

// Build the app (after service registration)
var app = builder.Build();

// Get the logger after app is built
ILogger<Program> _logger = app.Services.GetRequiredService<ILogger<Program>>();

// Log environment information
_logger.LogInformation("Application starting in environment: {Env}", builder.Environment.EnvironmentName);

// Middleware setup
app.UseExceptionHandler("/error");  // Global exception handling
app.UseStaticFiles();
app.UseRouting();

// Conditionally enable Swagger
if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = "api-docs";
        c.DisplayRequestDuration();
    });
}

// HTTPS redirection and fallback
app.UseHttpsRedirection();
app.MapFallbackToFile("index.html");  // Ensure React handles routes

// Enable Authentication and Authorization middleware
app.UseAuthentication();  // Required for using the [Authorize] attribute in controllers
app.UseAuthorization();  // Required for authorization policies

// Map controllers
app.MapControllers();  // This will now work because AddControllers() is registered

// Final log before running the app
_logger.LogInformation("Application setup complete. Running app...");

app.Run();

// Ensure logs are flushed before the app shuts down
Log.CloseAndFlush();
