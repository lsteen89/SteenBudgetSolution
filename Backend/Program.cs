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
using Microsoft.IdentityModel.Tokens;

// Third-party packages
using HealthChecks.UI.Client;
using Moq;
using Serilog;
using Mapster;

// Application layer
using Backend.Application;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Auth;

// Common layer
using Backend.Common.Services;

// Infrastructure layer
using Backend.Infrastructure;
using Backend.Infrastructure.Data.Sql.Health;
using Backend.Infrastructure.WebSockets;
using Backend.Infrastructure.Auth;
using Backend.Application.Abstractions.Infrastructure.Email;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Email.Postmark;
// Presentation layer
using Backend.Presentation.Middleware;

// Settings
using Backend.Settings;
using Backend.Settings.Email;

#endregion


var builder = WebApplication.CreateBuilder(args);

builder.Host.UseDefaultServiceProvider(o => { o.ValidateScopes = true; o.ValidateOnBuild = true; });

#region configurationFiles
// Add configuration files
//Config files
builder.Configuration.AddJsonFile("ExpiredTokenScannerSettings.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);
builder.Configuration.AddJsonFile("WebSocketHealthCheckSettings.json", optional: false, reloadOnChange: true);

#endregion

#region Configuration and Services
// Register In-Memory Distributed Cache
builder.Services.AddDistributedMemoryCache();

// Add environment variables to configuration
builder.Configuration.AddEnvironmentVariables();

// Mapster config + mapper
var mapsterConfig = TypeAdapterConfig.GlobalSettings;
// Scan the assemblies that contain your mappings (adjust as needed)
mapsterConfig.Scan(Assembly.GetExecutingAssembly());
builder.Services.AddSingleton(mapsterConfig);

// WEBSOCKET_SECRET configuration
var secret = builder.Configuration["WEBSOCKET_SECRET"]!;
builder.Services.Configure<WebSocketSettings>(o => o.Secret = secret);

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

// Set up JWT settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<JwtSettings>>().Value);
builder.Services.AddSingleton<IJwtKeyRing, HsKeyRing>();

// Email settings
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.Configure<PostmarkOptions>(builder.Configuration.GetSection("Postmark"));

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
//Log.Information("JWT Expiry Minutes: {ExpiryMinutes}", jwtSettings?.ExpiryMinutes);

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

#region Custom Service Registration
// Add services to the container
// 2. Register Services from other Layers
builder.Services
    .AddApplicationServices(builder.Configuration)
    .AddInfrastructureServices(builder.Configuration, builder.Environment.IsProduction());
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
#region Email DI Service Configuration
var provider = builder.Configuration["Email:Provider"] ?? "Smtp";
if (provider.Equals("Postmark", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddScoped<IEmailService, PostmarkEmailService>();
else
    builder.Services.AddScoped<IEmailService, EmailService>();
#endregion
#region Services and Middleware Registration

// Add controllers to support routing
builder.Services.AddControllers();

builder.Services.AddHttpClient<IRecaptchaService, RecaptchaService>(c =>
{
    c.Timeout = TimeSpan.FromSeconds(5);
});
// Add Swagger services
builder.Services.AddSwaggerGen();

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


builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = "AccessScheme";
    o.DefaultChallengeScheme = "AccessScheme";
})
.AddJwtBearer("AccessScheme", _ => { })      // options come from AddOptions below
.AddJwtBearer("RefreshScheme", _ => { });

builder.Services.AddOptions<JwtBearerOptions>("AccessScheme")
  .Configure<IJwtKeyRing, JwtSettings>((o, ring, jwt) =>
  {
      o.MapInboundClaims = false;
      o.TokenValidationParameters = new TokenValidationParameters
      {
          ValidIssuer = jwt.Issuer,
          ValidAudience = jwt.Audience,
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateIssuerSigningKey = true,
          IssuerSigningKeyResolver = (token, st, kid, p) =>
              kid is not null && ring.All.TryGetValue(kid, out var k)
                  ? new[] { k }
                  : ring.All.Values.ToArray(),
          ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
          ValidateLifetime = true,
          RequireExpirationTime = true,
          ClockSkew = TimeSpan.FromSeconds(30)
      };

      // Resolve scoped services PER REQUEST here (safe)
      o.Events = new JwtBearerEvents
      {
          OnTokenValidated = async ctx =>
          {
              var blacklist = ctx.HttpContext.RequestServices
                                             .GetRequiredService<ITokenBlacklistService>();
              var jti = ctx.Principal?.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
              if (jti != null && await blacklist.IsTokenBlacklistedAsync(jti))
                  ctx.Fail("revoked");
          }
      };
  });


builder.Services.AddOptions<JwtBearerOptions>("RefreshScheme")
  .Configure<IJwtKeyRing, JwtSettings>((o, ring, jwt) =>
  {
      o.MapInboundClaims = false;
      o.TokenValidationParameters = new TokenValidationParameters
      {
          ValidIssuer = jwt.Issuer,
          ValidAudience = jwt.Audience,
          ValidateIssuer = true,
          ValidateAudience = true,
          ValidateIssuerSigningKey = true,
          IssuerSigningKeyResolver = (token, st, kid, p) =>
            kid is not null && ring.All.TryGetValue(kid, out var k)
              ? new[] { k }
              : ring.All.Values.ToArray(),
          ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
          ValidateLifetime = false
      };
  });

builder.Services.AddAuthorization();

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

#endregion

// Declare partial Program class
public partial class Program { }
