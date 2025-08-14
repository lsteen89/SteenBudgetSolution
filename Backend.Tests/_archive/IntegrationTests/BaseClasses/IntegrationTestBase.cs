using Backend.Application.DTO.User;
using Backend.Application.Interfaces.AuthService;
using Backend.Application.Interfaces.Cookies;
using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.JWT;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.WebSockets;
using Backend.Application.Services.AuthService;
using Backend.Application.Services.UserServices;
using Backend.Common.Converters;
using Backend.Common.Interfaces;
using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Providers.UserProvider;
using Backend.Infrastructure.Data.Sql.Queries.UserQueries;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Implementations;
using Backend.Infrastructure.WebSockets;
using Backend.Settings;
using Backend.Test.UserTests;
using Backend.Tests.Mocks;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using System.Data.Common;
using System.Security.Claims;
using Xunit;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Helpers;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Tests.Helpers;
using Backend.Tests.Fixtures;
using Backend.Infrastructure.Data;
using MySqlConnector;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;

public abstract class IntegrationTestBase : IAsyncLifetime, IClassFixture<DatabaseFixture>
{
    protected readonly string ConnectionString;
    protected readonly SqlBase SqlBase;
    protected readonly ServiceProvider ServiceProvider;
    protected readonly ILogger Logger;
    protected readonly IUserServices UserServices;
    protected readonly IAuthService AuthService;
    protected readonly IUserSQLProvider UserSQLProvider;
    protected readonly ILegacyEmailService EmailService;
    protected readonly IUserTokenService UserTokenService;
    protected readonly IJwtService jwtService;
    protected readonly ITokenBlacklistService TokenBlacklistService;
    protected readonly UserServiceTest UserServiceTest;
    protected UserCreationDto _userCreationDto;
    protected readonly IEmailResetPasswordService EmailResetPasswordService;
    protected readonly ICookieService cookieService;
    protected readonly IWebSocketManager WebSocketManager;
    protected readonly Mock<IWebSocketManager> WebSocketManagerMock;

    protected Mock<IEnvironmentService> MockEnvironmentService { get; private set; }

    protected IntegrationTestBase(DatabaseFixture fixture)
    {
        ServiceProvider = fixture.ServiceProvider;  
        ConnectionString = fixture.ConnectionString;
        SqlBase = ServiceProvider.GetRequiredService<SqlBase>(); 
        SqlMapper.AddTypeHandler(typeof(Guid), new GuidTypeHandler());



        CookieContainer = new Dictionary<string, (string Value, CookieOptions Options)>();
        var serviceCollection = new ServiceCollection();

        // Mock IHttpContextAccessor with HttpContext setup
        var mockHttpContext = new Mock<HttpContext>();

        var mockHttpResponse = new Mock<HttpResponse>();
        var mockResponseCookies = new Mock<IResponseCookies>();

        mockResponseCookies
            .Setup(c => c.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()))
            .Callback<string, string, CookieOptions>((key, value, options) =>
            {
                CookieContainer[key] = (value, options); // Capture cookies
            });

        mockHttpResponse
            .Setup(r => r.Cookies)
            .Returns(mockResponseCookies.Object);

        mockHttpContext
            .Setup(c => c.Response)
            .Returns(mockHttpResponse.Object);

        // Initialize User as an empty ClaimsPrincipal
        mockHttpContext
            .Setup(c => c.User)
            .Returns(new ClaimsPrincipal(new ClaimsIdentity()));

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(mockHttpContext.Object);

        // Add IHttpContextAccessor to service collection
        serviceCollection.AddSingleton<IHttpContextAccessor>(httpContextAccessor.Object);

        // Initialize MockEnvironmentService
        MockEnvironmentService = new Mock<IEnvironmentService>();
        MockEnvironmentService
            .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
            .Returns("Production");
        serviceCollection.AddSingleton<IEnvironmentService>(MockEnvironmentService.Object);

        // Define and register JwtSettings
        var jwtSettings = new JwtSettings
        {
            Issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "eBudget",
            Audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "eBudget",
            SecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY") ?? "development-fallback-key",
            ExpiryMinutes = int.TryParse(Environment.GetEnvironmentVariable("JWT_EXPIRY_MINUTES"), out var expiry) ? expiry : 5,
            RefreshTokenExpiryDays = int.TryParse(Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRY_DAYS"), out var rtExpiry) ? rtExpiry : 30,
            RefreshTokenExpiryDaysAbsolute = int.TryParse(Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRY_DAYS_Absolute"), out var rtExpiryAbsolute) ? rtExpiryAbsolute : 90
        };

        var jwtParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                                         Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        serviceCollection.AddSingleton(jwtSettings);
        serviceCollection.AddSingleton<IOptions<JwtSettings>>(
            Options.Create(jwtSettings));
        // Make them injectable for JwtService *and* WebSocket handler
        serviceCollection.AddSingleton(jwtParams);

        // Register JwtService
        serviceCollection.AddScoped<IJwtService, JwtService>();

        // Mock IUserTokenService
        MockUserTokenService = new Mock<IUserTokenService>();
        serviceCollection.AddSingleton(MockUserTokenService.Object);

        // Mock IRecaptchaService
        RecaptchaServiceService = new Mock<IRecaptchaService>();
        RecaptchaServiceService
            .Setup(r => r.ValidateTokenAsync(It.IsAny<string>()))
            .ReturnsAsync(true); // Mock success
        serviceCollection.AddSingleton(RecaptchaServiceService.Object);

        // Mock ICookieService
        var mockCookieService = new Mock<ICookieService>();

        serviceCollection.AddSingleton(mockCookieService.Object);

        // Mock IEmailResetPasswordService
        var mockEmailResetPasswordService = new Mock<IEmailResetPasswordService>();
        mockEmailResetPasswordService
            .Setup(service => service.ResetPasswordEmailSender(It.IsAny<UserModel>()))
            .ReturnsAsync(true); // Simulate success
        serviceCollection.AddScoped<IEmailResetPasswordService>(_ => mockEmailResetPasswordService.Object);

        // Mock IWebSocketManager
        WebSocketManagerMock = new Mock<IWebSocketManager>();
        // **Set up SendMessageAsync to return completed task by default**
        WebSocketManagerMock
            .Setup(x => x.SendMessageAsync(It.IsAny<UserSessionKey>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
        serviceCollection.AddSingleton<IWebSocketManager>(WebSocketManagerMock.Object);

        // Mock ITimeProvider
        MockTimeProvider = new Mock<ITimeProvider>();
        MockTimeProvider.Setup(tp => tp.UtcNow).Returns(DateTime.UtcNow); // Default to current UTC time
        serviceCollection.AddSingleton<ITimeProvider>(MockTimeProvider.Object);

        // Add other services
        ConfigureTestServices(serviceCollection);

        // Build the service provider
        ServiceProvider = serviceCollection.BuildServiceProvider();

        // Retrieve shared dependencies
        Logger = ServiceProvider.GetRequiredService<ILogger<IntegrationTestBase>>();
        UserServices = ServiceProvider.GetRequiredService<IUserServices>();
        AuthService = ServiceProvider.GetRequiredService<IAuthService>();
        UserSQLProvider = ServiceProvider.GetRequiredService<IUserSQLProvider>();
        EmailService = ServiceProvider.GetRequiredService<ILegacyEmailService>();
        EmailResetPasswordService = ServiceProvider.GetRequiredService<IEmailResetPasswordService>();

        UserTokenService = ServiceProvider.GetRequiredService<IUserTokenService>();
        UserServiceTest = ServiceProvider.GetRequiredService<UserServiceTest>();
        UserAuthenticationService = ServiceProvider.GetRequiredService<IUserAuthenticationService>();

        jwtService = ServiceProvider.GetRequiredService<IJwtService>();
        TokenBlacklistService = ServiceProvider.GetRequiredService<ITokenBlacklistService>();
        cookieService = ServiceProvider.GetRequiredService<ICookieService>();
        WebSocketManager = ServiceProvider.GetRequiredService<IWebSocketManager>();

        // Initialize the HttpContext reference
        HttpContext = ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext;
    }

    protected IUserAuthenticationService UserAuthenticationService { get; private set; }
    protected Mock<IUserTokenService> MockUserTokenService { get; private set; }
    protected Mock<ITimeProvider> MockTimeProvider { get; set; }

    protected virtual void ConfigureTestServices(IServiceCollection services)
    {

        services.AddScoped<DbConnection>(sp =>
        {
            var factory = sp.GetRequiredService<IConnectionFactory>();
            var conn = factory.CreateConnection();   // MySqlConnection under the hood
            conn.Open();                                // open immediately
            return conn;
            });

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{MockEnvironmentService.Object.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.Configure<DatabaseSettings>(configuration.GetSection("DatabaseSettings"));


        services.AddSingleton<IConnectionFactory>(provider =>
            new MySqlConnectionFactory(
                provider.GetRequiredService<IOptions<DatabaseSettings>>().Value.ConnectionString));



        // Register application services
        services.AddScoped<IUserServices, UserServices>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<ILegacyEmailService, MockEmailService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IUserTokenService, UserTokenService>();
        services.AddScoped<IUserEmailService, UserEmailService>();
        services.AddScoped<ILegacyEmailPreparationService, LegacyEmailPreparationService>();
        services.AddScoped<IEmailVerificationService, EmailVerificationService>();
        services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();
        services.AddScoped<UserServiceTest>();
        services.AddScoped<ITransactionRunner, TransactionRunner>();
        services.AddScoped<ITokenBlacklistService, TokenBlacklistService>();
        services.AddScoped<IUserSqlExecutor, UserSqlExecutor>();
        services.AddScoped<IVerificationTokenSqlExecutor, VerificationTokenSqlExecutor>();
        services.AddScoped<IAuthenticationSqlExecutor, AuthenticationSqlExecutor>();
        services.AddScoped<ILogger<AuthenticationSqlExecutor>, Logger<AuthenticationSqlExecutor>>();
        services.AddScoped<IRefreshTokenSqlExecutor, RefreshTokenSqlExecutor>();
        services.AddScoped<IUserSQLProvider, UserSQLProvider>();

        // Register logging
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Information);
        });

        services.AddSingleton<ILogger<UserTokenService>>(provider =>
        {
            var loggerFactory = provider.GetRequiredService<ILoggerFactory>();
            return loggerFactory.CreateLogger<UserTokenService>();
        });

        // Remove Redis cache


        services.AddDistributedMemoryCache();

        // Register ILogger<UserAuthenticationService> with TestLogger
        services.AddSingleton<ILogger<UserAuthenticationService>, TestLogger<UserAuthenticationService>>();
        services.AddSingleton<ILogger<AuthService>, TestLogger<AuthService>>();


    }

    protected void ValidateHttpContext()
    {
        Assert.NotNull(HttpContext);
        Assert.NotNull(HttpContext.Response);
    }

    // Protected property for accessing cookies in tests
    protected Dictionary<string, (string Value, CookieOptions Options)> CookieContainer { get; private set; }

    // Protected HttpContext reference
    protected HttpContext HttpContext { get; private set; }

    public Mock<IRecaptchaService> RecaptchaServiceService { get; }

    public async Task InitializeAsync()
    {
        await ClearDatabaseAsync();
    }

    public async Task DisposeAsync()
    {
        await ClearDatabaseAsync();
        ServiceProvider.Dispose();
    }

    private async Task ClearDatabaseAsync()
    {
        // Custom logic to clear user data
        await UserServices.DeleteUserByEmailAsync("test@example.com");
    }

    protected async Task<UserModel> RegisterUserAsync(UserCreationDto userCreationDto)
    {
        Logger.LogInformation("Registering user: {Email}", userCreationDto.Email);
        await UserServices.RegisterUserAsync(userCreationDto);
        return await UserSQLProvider.UserSqlExecutor.GetUserModelAsync(email: userCreationDto.Email);
    }

    protected async Task<UserModel> SetupUserAsync()
    {
        _userCreationDto = new UserCreationDto
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!",
            CaptchaToken = "mock-captcha-token"
        };

        return await RegisterUserAsync(_userCreationDto);
    }

    protected async Task<UserModel> SetupUserAsync(UserCreationDto userCreationDto)
    {
        return await RegisterUserAsync(userCreationDto);
    }
    protected async Task<(DbConnection Connection, DbTransaction Transaction)> CreateTransactionAsync()
    {
        var helper = new TestDatabaseHelper(ConnectionString);
        return await helper.CreateAndBeginTransactionAsync();
    }
    public class TestLogger<T> : ILogger<T>
    {
        public List<string> Logs { get; } = new List<string>();

        public IDisposable BeginScope<TState>(TState state) => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception exception, Func<TState, Exception, string> formatter)
        {
            Logs.Add(formatter(state, exception));
        }
    }
    protected async Task<TResult> RunInTxAsync<TResult>(Func<DbConnection, DbTransaction, Task<TResult>> work)
    {
        await using var conn = new MySqlConnection(ConnectionString);   // <- match MariaDB
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();
        var result = await work(conn, tx);
        await tx.CommitAsync();                 // nothing fancy – commit and dispose
        return result;
    }
    protected async Task<(string Cookie, string AccessToken, string SessionId, DateTime ExpiresUtc)>
        LoginAndGetAuthAsync(HttpClient client)
    {
        var (ip, deviceId, userAgent) = AuthTestHelper.GetDefaultMetadata();
        var user = await SetupUserAsync();
        await UserServiceTest.ConfirmUserEmailAsync(user.PersoId);

        var dto = new UserLoginDto
        {
            Email = user.Email,
            Password = "Password123!",
            CaptchaToken = "mock-captcha-token"
        };
        var resp = await client.PostAsJsonAsync("/api/Auth/login", dto);
        resp.EnsureSuccessStatusCode();

        // extract the raw Set-Cookie header
        var setCookie = resp.Headers
            .GetValues("Set-Cookie")
            .First(h => h.StartsWith("RefreshToken=", StringComparison.OrdinalIgnoreCase));

        // parse the JSON body
        var json = await resp.Content.ReadFromJsonAsync<JsonDocument>();
        var root = json.RootElement;
        var at = root.GetProperty("accessToken").GetString();
        var sid = root.GetProperty("sessionId").GetString();
        var exp = DateTime.Parse(root.GetProperty("expiresUtc").GetString());

        return (setCookie, at, sid, exp);
    }
}
