using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using System.Text;
using System.Reflection;
using MySqlConnector;
using System.Data.Common;
using System.Threading.RateLimiting;
using Serilog.Sinks.Graylog; // Will be used in the future
using FluentValidation;
using FluentValidation.AspNetCore;
using Backend.Infrastructure.Helpers.Converters;
using Microsoft.Extensions.Options;
using Backend.Tests.Mocks;
using Backend.Infrastructure.Data;
using Moq;
using Backend.Infrastructure.Email;
using Backend.Domain.Entities;
using Backend.Application.Services.UserServices;
using Backend.Application.Services.Validation;
using Backend.Application.Validators;
using Backend.Infrastructure.Helpers;
using Backend.Application.Settings;
using Backend.Domain.Interfaces;
using Backend.Application.Interfaces;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Microsoft.Extensions.DependencyInjection;
using Backend.Application.Services.TokenServices;

var builder = WebApplication.CreateBuilder(args);
#region Serilog Configuration
// Configure Serilog early in the application lifecycle
var logFilePath = builder.Environment.IsProduction()
    ? "/var/www/backend/logs/app-log.txt"
    : "logs/app-log.txt";  // Default to this path for test and dev environments

// Initialize Serilog and set up logging before anything else
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File(logFilePath, rollingInterval: RollingInterval.Day)
    /*
    .WriteTo.Graylog(new GraylogSinkOptions
    {
        HostnameOrAddress = "192.168.50.61",
        Port = 12201
    })
    */
    .CreateLogger();
// Log the file path after Serilog is initialized
Log.Information($"Log file path: {logFilePath}");

// Set Serilog as the logging provider
builder.Host.UseSerilog();
#endregion

#region Application Build Information
// Get the build date and time of the application
var buildDateTime = BuildInfoHelper.GetBuildDate(Assembly.GetExecutingAssembly());
Log.Information($"Application build date and time: {buildDateTime}");
#endregion

#region Dapper Type Handler
SqlMapper.AddTypeHandler(new GuidTypeHandler());
#endregion

// Continue configuring services and the rest of the application
var configuration = builder.Configuration;

// Add services to the container
#region Injected Services

// Section for SQL related services
builder.Services.AddScoped<UserSqlExecutor>();
builder.Services.AddScoped<TokenSqlExecutor>();

builder.Services.AddScoped<UserServices>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddTransient<RecaptchaHelper>();
builder.Services.AddScoped<IRecaptchaService, RecaptchaService>();
builder.Services.Configure<ResendEmailSettings>(builder.Configuration.GetSection("ResendEmailSettings"));
builder.Services.AddScoped<DbConnection>(provider =>
{
    var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");

    if (string.IsNullOrEmpty(connectionString))
    {
        throw new InvalidOperationException("Database connection string not found in environment variables.");
    }

    // Return a new MySqlConnection instance with the connection string
    return new MySqlConnection(connectionString);
});
// Configure EmailService based on environment
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<IEmailService, MockEmailService>();

    var mockEmailPreparationService = new Mock<IEmailPreparationService>();
    mockEmailPreparationService
        .Setup(service => service.PrepareVerificationEmailAsync(It.IsAny<EmailMessageModel>()))
        .ReturnsAsync((EmailMessageModel email) => email);

    mockEmailPreparationService
        .Setup(service => service.PrepareContactUsEmailAsync(It.IsAny<EmailMessageModel>()))
        .ReturnsAsync((EmailMessageModel email) => email);

    builder.Services.AddSingleton<IEmailPreparationService>(mockEmailPreparationService.Object);
}
else
{
    builder.Services.AddSingleton<IEmailService, EmailService>();
    builder.Services.AddSingleton<IEmailPreparationService, EmailPreparationService>();
}

builder.Services.AddScoped<UserVerificationHelper>(provider =>
{
    var userSqlExecutor = provider.GetRequiredService<UserSqlExecutor>();
    var emailService = provider.GetRequiredService<IEmailService>();
    var options = provider.GetRequiredService<IOptions<ResendEmailSettings>>();
    var logger = provider.GetRequiredService<ILogger<UserVerificationHelper>>();


    Func<string, Task<bool>> sendVerificationEmail = async email =>
        await emailService.ProcessAndSendEmailAsync(new EmailMessageModel { Recipient = email });

    Func<DateTime> getCurrentTime = () => DateTime.UtcNow;


    return new UserVerificationHelper(userSqlExecutor, emailService, options, logger, sendVerificationEmail, getCurrentTime);
});
#endregion

#region Rate Limiter Configuration
// Add rate limiting services
builder.Services.AddRateLimiter(options =>
{
    // Set a global limiter using PartitionedRateLimiter.Create
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "global",
            factory: key => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,               // Allow 10 requests per minute
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));

    // Registration-specific rate limit policy
    options.AddPolicy("RegistrationPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress!, key =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 1
            }));

    // Email sending rate limit policy
    // is used in the EmailController
    // Todo: Measure and adjust the rate limit for production
    options.AddPolicy("EmailSendingPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress!, key =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 1
            }));
    
});
#endregion

#region Services and Middleware Registration
// Register Swagger services
builder.Services.AddSwaggerGen();
// Add controller services to support routing to your controllers
builder.Services.AddControllers();

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

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<UserValidator>();
#endregion

#region Application Pipeline Configuration
// Build the app (after service registration)
var app = builder.Build();

if (builder.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentCorsPolicy");  // Apply CORS for development
}
else
{
    app.UseCors("ProductionCorsPolicy");   // Apply CORS for production
}

// Middleware for exception handling, routing, and static file support
app.UseExceptionHandler("/error");  // Global exception handling
app.UseStaticFiles();               // Serve static files
app.UseRouting();                   // Enable routing
app.UseAuthorization();   // Required for authorization policies

// Enable Authentication and Authorization middleware
app.UseAuthentication();  // Required for using the [Authorize] attribute in controllers
// Use rate limiter middleware globally
app.UseRateLimiter();

// Map controllers and assign specific policies per controller route
app.MapControllers(); // Automatically maps and applies rate limits set in controllers

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
// Map controllers
app.MapControllers();  // Ensure the controllers are mapped

#endregion
// Get the logger after app is built
ILogger<Program> _logger = app.Services.GetRequiredService<ILogger<Program>>();

// Log environment information
_logger.LogInformation("Application starting in environment: {Env}", builder.Environment.EnvironmentName);

// Final log before running the app
_logger.LogInformation("Application setup complete. Running app...");

app.Run();

// Ensure logs are flushed before the app shuts down
Log.CloseAndFlush();