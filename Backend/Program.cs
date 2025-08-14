#region using directives

// System namespaces
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;

// Microsoft namespaces
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

// Third-party packages
using FluentValidation;
using FluentValidation.AspNetCore;
using HealthChecks.UI.Client;
using Moq;
using Serilog;
using Mapster;


// Domain layer
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Email;


// Application layer
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Email;

using Backend.Application.Abstractions.Infrastructure.RateLimiting;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors;
using Backend.Application.Options.Email;
using Backend.Application.Options.URL;
using Backend.Application.Options.Auth;
using Backend.Application.Validators;
using Backend.Application.Mappings;


// Infrastructure layer
using Backend.Infrastructure.BackgroundServices;
using Backend.Infrastructure.Data.Sql.Factories;
using Backend.Infrastructure.Data.Sql.Health;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Identity;
using Backend.Infrastructure.Implementations;
using Backend.Infrastructure.Repositories.Budget;
using Backend.Infrastructure.Repositories.Email;
using Backend.Infrastructure.Repositories.User;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.WebSockets;


// Common layer
using Backend.Common.Services;

// Presentation layer
using Backend.Presentation.Middleware;

// Settings
using Backend.Settings;
using Backend.Settings.Email;


#endregion


var builder = WebApplication.CreateBuilder(args);

#region configurationFiles
// Add configuration files
//Config files
builder.Configuration.AddJsonFile("ExpiredTokenScannerSettings.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile("WebSocketHealthCheckSettings.json", optional: false, reloadOnChange: true);

// Configure the ExpiredTokenScannerSettings
builder.Services.Configure<ExpiredTokenScannerSettings>(
    builder.Configuration.GetSection("ExpiredTokenScannerSettings"));

// Configure the WebSocketHealthCheckSettings
builder.Services.Configure<WebSocketHealthCheckSettings>(
    builder.Configuration.GetSection("WebSocketHealthCheckSettings"));

// Configure the JWT settings
var jwtSettingsSection = builder.Configuration.GetSection("JwtSettings");

// DB settings
builder.Services.Configure<DatabaseSettings>(builder.Configuration.GetSection("DatabaseSettings"));

// Email settings (Smtp)
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));


#endregion

#region Mappings
// Register global type adapter config
var cfg = TypeAdapterConfig.GlobalSettings;
UserMappings.Register(cfg);
#endregion

#region Configuration and Services
// Register In-Memory Distributed Cache
builder.Services.AddDistributedMemoryCache();

// MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));



// Add environment variables to configuration
builder.Configuration.AddEnvironmentVariables();
builder.Services
    .AddOptions<JwtSettings>()
    .Bind(builder.Configuration.GetSection("JwtSettings"))
    .Validate(s => !string.IsNullOrWhiteSpace(s.SecretKey), "JWT secret missing")
    .Validate(s => GetSigningKeyBytesFromConfigValue(s.SecretKey).Length >= 32, "JWT secret too short (<32 bytes)")
    .ValidateOnStart();

// WEBSOCKET_SECRET configuration
var secret = builder.Configuration["WEBSOCKET_SECRET"]!;
builder.Services.Configure<WebSocketSettings>(o => o.Secret = secret);

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// Set up JWT settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>();


if (builder.Environment.IsProduction())
{
    // Configure Redis Cache
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration.GetSection("Redis")["ConnectionString"];
        options.InstanceName = "eBudget:"; // Optional prefix for keys
    });

    builder.Services.AddScoped<ITokenBlacklistService, TokenBlacklistService>();
}
else // Development, Testing, CI
{
    builder.Services.AddDistributedMemoryCache();       // in-proc

    // NoopBlacklistService is a mock that simulates a blacklisted state
    // It implements ITokenBlacklistService and always returns true for IsTokenBlacklistedAsync

    //builder.Services.AddSingleton<ITokenBlacklistService, NoopBlacklistService>();
    builder.Services.AddScoped<ITokenBlacklistService, NoopBlacklistService>();
}
// Add JsonOptions to use camelCase for JSON properties
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // PART 1: This sets the policy for property NAMES.
        // It will turn C# `NetSalary` into JSON `"netSalary"`.
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;

        // PART 2: This sets the policy for enum VALUES.
        // It will turn C# `Frequency.Monthly` into the JSON string `"monthly"`.
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)
        );
    });

// EMAIL OPTIONS
// Options
builder.Services.AddOptions<EmailRateLimitOptions>()
    .Bind(builder.Configuration.GetSection("EmailRateLimit"))
    .ValidateDataAnnotations().ValidateOnStart();

builder.Services.AddOptions<AppUrls>()
    .Bind(builder.Configuration.GetSection("AppUrls"))
    .ValidateDataAnnotations().ValidateOnStart();

// Token TTL
builder.Services.AddOptions<VerificationTokenOptions>()
    .Bind(builder.Configuration.GetSection("VerificationToken"))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// Auth lockout options
builder.Services.AddOptions<AuthLockoutOptions>()
        .BindConfiguration("AuthLockout")
        .ValidateDataAnnotations()
        .ValidateOnStart();


#endregion

#region Serilog Configuration
// Configure Serilog early in the application lifecycle
var logFilePath = "logs/app-log.txt";

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
Log.Information("JWT Expiry Minutes: {ExpiryMinutes}", jwtSettings?.ExpiryMinutes);

// Set Serilog as the logging provider
builder.Host.UseSerilog();
#endregion

#region Application Build Information
// Build metadata
var buildDateTime = BuildInfoHelper.GetBuildDate(Assembly.GetExecutingAssembly());
var assembly = Assembly.GetExecutingAssembly();
var fileVersion = assembly.GetCustomAttribute<AssemblyFileVersionAttribute>()?.Version ?? "unknown";
var infoVersion = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "unknown";
Log.Information("Version: {Version} | Info: {InfoVersion} | Build: {BuildDate}", fileVersion, infoVersion, buildDateTime);

// Optional: read IMAGE_TAG passed from compose (for runtime confirmation)
var imageTag = Environment.GetEnvironmentVariable("IMAGE_TAG") ?? "unknown";

#endregion

#region Dapper Type Handler
// Old way, keeping for reference
//SqlMapper.AddTypeHandler(new GuidTypeHandler());

// New way using generic method
//SqlMapper.AddTypeHandler(typeof(Guid), new GuidTypeHandler());
#endregion

// Continue configuring services and the rest of the application
var configuration = builder.Configuration;

// Add services to the container
#region Injected Services

// Section for SQL related services
// Connection factory
builder.Services.AddScoped<IConnectionFactory>(provider =>
{
    var settings = provider.GetRequiredService<IOptions<DatabaseSettings>>().Value;
    if (string.IsNullOrEmpty(settings.ConnectionString))
    {
        throw new InvalidOperationException("Database connection string not found in configuration.");
    }
    return new MySqlConnectionFactory(settings.ConnectionString);
});
// Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

// Contexts
builder.Services.AddScoped<ICurrentUserContext, HttpCurrentUserContext>();

// Repositories
// Budget
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IIncomeRepository, IncomeRepository>();
builder.Services.AddScoped<IExpenditureRepository, ExpenditureRepository>();
builder.Services.AddScoped<ISavingsRepository, SavingsRepository>();
builder.Services.AddScoped<IDebtsRepository, DebtsRepository>();
// User
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Wizard Step Processors
builder.Services.AddScoped<IWizardStepProcessor, IncomeStepProcessor>();
builder.Services.AddScoped<IWizardStepProcessor, ExpenseStepProcessor>();
builder.Services.AddScoped<IWizardStepProcessor, SavingsStepProcessor>();

// Recaptcha service
builder.Services.AddHttpClient<IRecaptchaService, RecaptchaService>();

// Section for email services
builder.Services.AddScoped<IEmailRateLimitRepository, EmailRateLimitRepository>();
builder.Services.AddScoped<IEmailRateLimiter, EmailRateLimiter>();
builder.Services.AddScoped<IEmailService, EmailService>();

// Other various services
builder.Services.AddScoped<ITimeProvider, Backend.Common.Services.TimeProvider>();
builder.Services.AddScoped<ICookieService, CookieService>();
// JWT Service
builder.Services.AddScoped<IJwtService, JwtService>();


// Configure EmailService based on environment
/*
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<ILegacyEmailService, MockEmailService>();

    var mockEmailPreparationService = new Mock<ILegacyEmailPreparationService>();
    mockEmailPreparationService
        .Setup(service => service.PrepareVerificationEmailAsync(It.IsAny<EmailMessageModel>()))
        .ReturnsAsync((EmailMessageModel email) => email);

    mockEmailPreparationService
        .Setup(service => service.PrepareContactUsEmailAsync(It.IsAny<EmailMessageModel>()))
        .ReturnsAsync((EmailMessageModel email) => email);

    builder.Services.AddSingleton<ILegacyEmailPreparationService>(mockEmailPreparationService.Object);
}
else
{
    builder.Services.AddSingleton<ILegacyEmailService, LegacyEmailService>();
    builder.Services.AddSingleton<ILegacyEmailPreparationService, LegacyEmailPreparationService>();
}
*/

// Add WebSockets and their helpers
builder.Services.AddSingleton<IWebSocketManager, Backend.Infrastructure.WebSockets.WebSocketManager>();
//builder.Services.AddHostedService(provider => (Backend.Infrastructure.WebSockets.WebSocketManager)provider.GetRequiredService<IWebSocketManager>());

//Wizard Validation
builder.Services.AddValidatorsFromAssemblyContaining<IncomeValidator>();

// Background services
builder.Services.AddHostedService<ExpiredTokenScanner>();
builder.Services.AddHostedService<WebSocketHealthCheckService>();


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
                PermitLimit = 3,                 // Allow 3 requests
                Window = TimeSpan.FromMinutes(2), // In a 2-minute window
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0                   // No queueing
            }));
    // Login rate limit policy
    options.AddPolicy("LoginPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress!, key =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,                  // Allow 5 login attempts
                Window = TimeSpan.FromMinutes(15), // Within a 15-minute window
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0                    // No queuing for additional requests
            }));
    // Email sending rate limit policy
    // is used in the EmailController
    // Todo: Measure and adjust the rate limit for production
    options.AddPolicy("EmailSendingPolicy", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress!, key =>
            new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(15),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    // Log rate-limiting rejections
    options.OnRejected = (context, cancellationToken) =>
    {
        var policyName = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName ?? "Global";
        var ipAddress = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogWarning("Rate limit exceeded: Policy={Policy}, IP={IP}, Endpoint={Endpoint}",
            policyName, ipAddress, context.HttpContext.Request.Path);

        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        return new ValueTask(context.HttpContext.Response.WriteAsync(
            "Rate limit exceeded. Please try again later.", cancellationToken));
    };

});
#endregion

#region Services and Middleware Registration

// Add controllers to support routing
builder.Services.AddControllers();

// Add Swagger services
builder.Services.AddSwaggerGen();

// Add FluentValidation for DTO validation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<UserValidator>();

// Add CORS policies
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevelopmentCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Local frontend URL
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });

    options.AddPolicy("ProductionCorsPolicy", policy =>
    {
        policy.WithOrigins("https://ebudget.se", "https://www.ebudget.se") // Production URLs
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });

    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// *** Configure JWT Bearer Authentication ***

// JwtBearer pipeline
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var rawSecret = GetRawJwtSecret(builder.Configuration);
var keyBytes = GetSigningKeyBytesFromConfigValue(rawSecret);

var jwtParams = new TokenValidationParameters
{
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(keyBytes), // Use the key bytes from the configuration
    ValidateIssuer = false,
    ValidateAudience = false,
    ValidateLifetime = true,
    ClockSkew = TimeSpan.Zero
};

builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = "AccessScheme";
    o.DefaultChallengeScheme = "AccessScheme";
})
//  Access + lifetime 
.AddJwtBearer("AccessScheme", o =>
{
    o.TokenValidationParameters = jwtParams;


    o.MapInboundClaims = false;

    // --- END: Explicit configuration ---


    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async ctx =>
        {
            var repo = ctx.HttpContext.RequestServices.GetRequiredService<ITokenBlacklistService>();
            var logger = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>(); // Or ILogger<Startup>
            var ct = CancellationToken.None; // Use a default cancellation token

            var jti = ctx.Principal?.FindFirstValue(JwtRegisteredClaimNames.Jti);
            if (jti != null && await repo.IsTokenBlacklistedAsync(jti, ct))
            {
                logger.LogWarning("Rejected JTI {jti} black-listed", jti);
                ctx.Fail("revoked");
            }
        }
    };
})
//  Refresh lifetime 
.AddJwtBearer("RefreshScheme", o =>
{
    var p = jwtParams.Clone();
    p.ValidateLifetime = false;
    o.TokenValidationParameters = p;
    o.MapInboundClaims = false;
});

builder.Services.AddAuthorization();
// jwtParams needed elsewhere (e.g. token generator)
builder.Services.AddSingleton(jwtParams);

// Add HttpContextAccessor
builder.Services.AddHttpContextAccessor();

// Add Health Checks
builder.Services
    .AddHealthChecks()
    .AddCheck<MariaDbHealthCheck>("mariadb", tags: new[] { "dependencies" });
#endregion

#region Application Pipeline Configuration

// Build the app after service registration
var app = builder.Build();
app.UseRouting();
// Apply CORS based on the environment
if (builder.Environment.IsDevelopment())
{
    app.UseCors("DevelopmentCorsPolicy");
}
else if (builder.Environment.IsProduction())
{
    app.UseCors("ProductionCorsPolicy");
}
else
{
    app.UseCors("DefaultCorsPolicy"); // Fallback for other environments
}

// Global exception handling
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        logger.LogError(exception, "An unhandled exception occurred.");
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsync("An unexpected error occurred.");
    });
});

// Endpoints (liveness vs readiness)
app.MapHealthChecks("/api/healthz", new HealthCheckOptions
{
    Predicate = _ => false, // liveness only, no deps
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
}).AllowAnonymous();

app.MapHealthChecks("/api/readyz", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("dependencies"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
}).AllowAnonymous();

// Middleware for static files with caching headers
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=3600");
    }
});

// Enable Authentication and Authorization
app.UseAuthentication();
app.UseAuthorization();

// Use Token Blacklist Middleware
app.UseMiddleware<TokenBlacklistMiddleware>();

// Use Rate Limiting Middleware (if configured)
app.UseRateLimiter();

// Swagger configuration
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = "api-docs";
        c.DisplayRequestDuration();
        c.DefaultModelsExpandDepth(-1); // Collapse models by default
    });
}

// HTTPS redirection
//app.UseHttpsRedirection();

// Map controllers
app.MapControllers();

// Map health checks
app.MapHealthChecks("/health");

// Fallback to React's index.html for SPA routing
app.MapFallbackToFile("index.html");

// *** WebSockets Middleware *** //
app.UseWebSockets();
app.Map("/ws/auth", WebSocketEndpoints.Auth);

#endregion

#region Logging and Final Setup

// Get the logger after app is built
ILogger<Program> _logger = app.Services.GetRequiredService<ILogger<Program>>();

// Log environment information
var environment = builder.Environment.EnvironmentName;
_logger.LogInformation("Environment: {Environment}", environment);
_logger.LogInformation("Application setup complete. Running app...");

// Run the application
app.Run();

#endregion

#region Helper Methods
static byte[] GetSigningKeyBytesFromConfigValue(string raw)
{
    if (string.IsNullOrWhiteSpace(raw))
        throw new InvalidOperationException("JWT secret missing");

    if (raw.StartsWith("base64:", StringComparison.OrdinalIgnoreCase))
        return Convert.FromBase64String(raw["base64:".Length..].Trim());

    var bytes = Encoding.UTF8.GetBytes(raw);
    if (bytes.Length < 32)
        throw new InvalidOperationException("JWT secret too short. Use >= 32 bytes or base64:...");
    return bytes;
}

// Helper that checks both config key and legacy env var:
string GetRawJwtSecret(IConfiguration cfg)
{
    // Primary: bound settings (supports `JwtSettings__SecretKey`)
    var fromSettings = cfg["JwtSettings:SecretKey"];
    if (!string.IsNullOrWhiteSpace(fromSettings)) return fromSettings;

    // Legacy/backup: plain env var
    var legacy = cfg["JWT_SECRET_KEY"]; // because AddEnvironmentVariables() added envs to cfg
    if (!string.IsNullOrWhiteSpace(legacy)) return legacy;

    throw new InvalidOperationException("No JWT secret found in JwtSettings:SecretKey or JWT_SECRET_KEY");
}
#endregion

// Declare partial Program class
public partial class Program { }
