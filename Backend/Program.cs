using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.RecaptchaService;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Services.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Application.Services.Validation;
using Backend.Application.Settings;
using Backend.Application.Validators;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Data.Sql.Provider;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Helpers;
using Backend.Infrastructure.Helpers.Converters;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Security;
using Backend.Tests.Mocks;
using Dapper;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Moq;
using MySqlConnector;
using Serilog;
using System.Data.Common;
using System.Reflection;
using System.Text;
using System.Threading.RateLimiting;

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
builder.Services.AddScoped<IUserSqlExecutor, UserSqlExecutor>();
builder.Services.AddScoped<ITokenSqlExecutor, TokenSqlExecutor>();
builder.Services.AddScoped<IAuthenticationSqlExecutor, AuthenticationSqlExecutor>();
// Add the UserSQLProvider to the services
builder.Services.AddScoped<IUserSQLProvider, UserSQLProvider>();


// Section for user services
builder.Services.AddScoped<IUserServices, UserServices>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddScoped<IUserTokenService, UserTokenService>();

builder.Services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();

// Section for email services
builder.Services.AddScoped<IEmailVerificationService, EmailVerificationService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IUserEmailService, UserEmailService>();
builder.Services.AddScoped<IEmailPreparationService, EmailPreparationService>();
builder.Services.AddScoped<IEmailResetPasswordService, EmailResetPasswordService>();

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<LogHelper>();

builder.Services.AddScoped<IEnvironmentService, EnvironmentService>();
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
builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthorization();  

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
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

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
var environment = builder.Environment.EnvironmentName;
Console.WriteLine($"Environment: {environment}");
Console.WriteLine($"BaseUrl: {configuration["AppSettings:BaseUrl"]}");
// Final log before running the app
_logger.LogInformation("Application setup complete. Running app...");

app.Run();

// Ensure logs are flushed before the app shuts down
Log.CloseAndFlush();