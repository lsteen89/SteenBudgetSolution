using System;
using Microsoft.Extensions.DependencyInjection;
using Backend.Tests.Mocks;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Interfaces.EmailServices;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using System.Data.Common;
using Xunit;
using Backend.Application.DTO;
using Backend.Domain.Entities;
using Backend.Application.Services.UserServices;
using Backend.Infrastructure.Email;
using Backend.Infrastructure.Security;
using Backend.Infrastructure.Interfaces;
using Backend.Infrastructure.Helpers;
using Microsoft.AspNetCore.Http;
using Backend.Test.UserTests;
using Moq;
using System.Net;

public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly ServiceProvider ServiceProvider;
    protected readonly ILogger Logger;
    protected readonly IUserServices UserServices;
    protected readonly IUserSqlExecutor UserSqlExecutor;
    protected readonly IEmailService EmailService;
    protected readonly IUserTokenService UserTokenService;
    protected readonly UserServiceTest UserServiceTest;
    protected UserCreationDto _userCreationDto;
    protected readonly IEmailResetPasswordService EmailResetPasswordService;
    protected Mock<IEnvironmentService> MockEnvironmentService { get; private set; }

    protected IntegrationTestBase()
    {
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

        serviceCollection.AddScoped<ITokenService, TokenService>();
        // Mock IUserTokenService
        MockUserTokenService = new Mock<IUserTokenService>();
        serviceCollection.AddSingleton(MockUserTokenService.Object);

        // Mock IEmailResetPasswordService
        var mockEmailResetPasswordService = new Mock<IEmailResetPasswordService>();
        mockEmailResetPasswordService
            .Setup(service => service.ResetPasswordEmailSender(It.IsAny<UserModel>()))
            .ReturnsAsync(true); // Simulate success
        serviceCollection.AddScoped<IEmailResetPasswordService>(_ => mockEmailResetPasswordService.Object);

        

        // Add other services
        ConfigureTestServices(serviceCollection);

        // Build the service provider
        ServiceProvider = serviceCollection.BuildServiceProvider();

        // Retrieve shared dependencies
        Logger = ServiceProvider.GetRequiredService<ILogger<IntegrationTestBase>>();
        UserServices = ServiceProvider.GetRequiredService<IUserServices>();
        UserSqlExecutor = ServiceProvider.GetRequiredService<IUserSqlExecutor>();
        EmailService = ServiceProvider.GetRequiredService<IEmailService>();
        EmailResetPasswordService = ServiceProvider.GetRequiredService<IEmailResetPasswordService>();

        UserTokenService = ServiceProvider.GetRequiredService<IUserTokenService>();
        UserServiceTest = ServiceProvider.GetRequiredService<UserServiceTest>();
        UserAuthenticationService = ServiceProvider.GetRequiredService<IUserAuthenticationService>();

        // Initialize the HttpContext reference
        HttpContext = ServiceProvider.GetRequiredService<IHttpContextAccessor>().HttpContext;
    }
    protected IUserAuthenticationService UserAuthenticationService { get; private set; }
    protected Mock<IUserTokenService> MockUserTokenService { get; private set; }
    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
            .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development"}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IEnvironmentService, EnvironmentService>();

        services.AddScoped<DbConnection>(provider =>
        {
            var connectionString = configuration.GetConnectionString("TestDatabase")
                                   ?? Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
                                   ?? throw new InvalidOperationException("Database connection string is required.");
            return new MySqlConnection(connectionString);
        });

        // Register application services
        services.AddScoped<IUserSqlExecutor, UserSqlExecutor>();
        services.AddScoped<IUserServices, UserServices>();
        services.AddSingleton<IEmailService, MockEmailService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IUserTokenService, UserTokenService>();
        services.AddScoped<ITokenSqlExecutor, TokenSqlExecutor>();
        services.AddScoped<IUserEmailService, UserEmailService>();
        services.AddScoped<IEmailPreparationService, EmailPreparationService>();
        services.AddScoped<IEmailVerificationService, EmailVerificationService>();
        services.AddScoped<IUserAuthenticationService, UserAuthenticationService>();
        services.AddScoped<IEnvironmentService>(_ => MockEnvironmentService.Object); 
        services.AddScoped<UserServiceTest>();
        services.AddScoped<ITokenService, TokenService>(); 
        // Register logging
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Information);
        });

        // Mock IHttpContextAccessor with HttpContext setup
        var mockHttpContext = new Mock<HttpContext>();
        var mockHttpResponse = new Mock<HttpResponse>();
        var mockResponseCookies = new Mock<IResponseCookies>();

        var cookieContainer = new Dictionary<string, (string Value, CookieOptions Options)>();

        mockResponseCookies
            .Setup(c => c.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()))
            .Callback<string, string, CookieOptions>((key, value, options) =>
            {
                CookieContainer[key] = (value, options); // Capture cookies in the shared container
            });

        mockHttpResponse
            .Setup(r => r.Cookies)
            .Returns(mockResponseCookies.Object);

        mockHttpContext
            .Setup(c => c.Response)
            .Returns(mockHttpResponse.Object);

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(mockHttpContext.Object);

        services.AddSingleton<IHttpContextAccessor>(httpContextAccessor.Object);

        services.AddSingleton<ILogger<UserAuthenticationService>, TestLogger<UserAuthenticationService>>();

        // Register MockEnvironmentService
        MockEnvironmentService = new Mock<IEnvironmentService>();

    }
    protected void ValidateHttpContext()
    {
        Assert.NotNull(HttpContext);
        Assert.NotNull(HttpContext.Response);
    }
    // Protected property for accessing cookies in tests
    protected Dictionary<string, (string Value, CookieOptions Options)> CookieContainer { get; private set; }
    protected Mock<ITokenService> MockTokenService { get; private set; }

    // Protected HttpContext reference
    protected HttpContext HttpContext { get; private set; }

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
        return await UserSqlExecutor.GetUserModelAsync(email: userCreationDto.Email);
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

}


