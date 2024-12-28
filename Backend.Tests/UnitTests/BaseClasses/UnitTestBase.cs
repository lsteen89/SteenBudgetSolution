using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Settings;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Backend.Tests.Mocks; 
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Microsoft.Extensions.Configuration;
using Backend.Infrastructure.Security;
using Xunit;
using Backend.Application.Services.UserServices;

public abstract class UnitTestBase
{
    protected IServiceProvider ServiceProvider;
    protected Mock<IUserSqlExecutor> MockUserSqlExecutor;
    protected Mock<ITokenSqlExecutor> MockTokenSqlExecutor;
    protected EmailVerificationService EmailVerificationService;
    protected Mock<IHttpContextAccessor> MockHttpContextAccessor;
    protected Mock<ILogger<UserAuthenticationService>> LoggerMockAuth;
    protected Mock<IConfiguration> MockConfiguration;
    protected Mock<ILogger<UserServices>> LoggerMock;
    protected Mock<IEnvironmentService> MockEnvironmentService;
    protected TokenService TokenServiceInstance;
    protected Mock<IUserTokenService> MockUserTokenService;
    protected Mock<HttpContext> MockHttpContext;
    protected Mock<HttpResponse> MockHttpResponse;
    protected UserServices UserServicesInstance;
    protected Mock<IEmailResetPasswordService> MockEmailResetPasswordService;
    protected Dictionary<string, (string Value, CookieOptions Options)> CookiesContainer;

    public UnitTestBase()
    {
        Setup();
    }

    public void Setup()
    {
        var services = new ServiceCollection();

        // Initialize mocks
        MockUserSqlExecutor = new Mock<IUserSqlExecutor>();
        MockTokenSqlExecutor = new Mock<ITokenSqlExecutor>();
        MockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        MockConfiguration = new Mock<IConfiguration>();
        LoggerMock = new Mock<ILogger<UserServices>>();
        LoggerMockAuth = new Mock<ILogger<UserAuthenticationService>>();
        MockUserTokenService = new Mock<IUserTokenService>();
        MockEmailResetPasswordService = new Mock<IEmailResetPasswordService>();
        MockEnvironmentService = new Mock<IEnvironmentService>();
        MockHttpContext = new Mock<HttpContext>();
        MockHttpResponse = new Mock<HttpResponse>();
        CookiesContainer = new Dictionary<string, (string Value, CookieOptions Options)>();

        // Mock Configuration
        MockConfiguration
            .Setup(config => config["JWT_SECRET_KEY"])
            .Returns("YourTestJwtSecretKey12345678901234567856456");

        MockEnvironmentService
            .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
            .Returns("Development");

        // Mock HttpContext response
        MockHttpContext
            .Setup(c => c.Response)
            .Returns(MockHttpResponse.Object);

        MockHttpResponse
            .Setup(r => r.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()))
            .Callback<string, string, CookieOptions>((key, value, options) =>
            {
                CookiesContainer[key] = (value, options);
            });

        // Register dependencies
        var mockLoggerForMockEmailService = Mock.Of<ILogger<MockEmailService>>();
        var mockEmailPreparationService = Mock.Of<IEmailPreparationService>(); // Can use a real/mock implementation
        var mockLoggerForUserAuthenticationService = Mock.Of<ILogger<UserAuthenticationService>>();

        services.AddScoped<IUserSqlExecutor>(_ => MockUserSqlExecutor.Object);
        services.AddScoped<ITokenSqlExecutor>(_ => MockTokenSqlExecutor.Object);
        services.AddScoped<IEmailResetPasswordService>(_ => MockEmailResetPasswordService.Object);

        // Register MockEmailService as the real implementation of IEmailService
        services.AddScoped<IEmailService>(_ => new MockEmailService(
            mockLoggerForMockEmailService,
            mockEmailPreparationService
        ));

        var mockOptions = Options.Create(new ResendEmailSettings { CooldownPeriodMinutes = 5, DailyLimit = 3 });
        services.AddSingleton(mockOptions);

        services.AddScoped<IEmailVerificationService>(_ => new EmailVerificationService(
            MockUserSqlExecutor.Object,
            MockUserTokenService.Object,
            ServiceProvider.GetRequiredService<IEmailService>(),
            mockOptions,
            Mock.Of<ILogger<EmailVerificationService>>(),
            mockEmailPreparationService,
            () => DateTime.UtcNow
        ));

        services.AddScoped<IUserServices>(provider =>
        {
            return new UserServices(
                Mock.Of<IUserManagementService>(),
                Mock.Of<IUserTokenService>(),
                Mock.Of<IUserEmailService>(),
                provider.GetRequiredService<IEmailVerificationService>(),
                Mock.Of<IUserAuthenticationService>(),
                MockUserSqlExecutor.Object,
                LoggerMock.Object
            );
        });

        // Build ServiceProvider
        ServiceProvider = services.BuildServiceProvider();

        // Resolve services for testing
        EmailVerificationService = ServiceProvider.GetRequiredService<IEmailVerificationService>() as EmailVerificationService;
        UserServicesInstance = ServiceProvider.GetRequiredService<IUserServices>() as UserServices;

        // Assertions to validate setup
        Assert.NotNull(EmailVerificationService);
        Assert.NotNull(ServiceProvider.GetRequiredService<IEmailService>());
    }
    public class TestLogger<T> : ILogger<T>
    {
        public List<string> Logs { get; } = new List<string>();

        public IDisposable BeginScope<TState>(TState state) => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception exception,
            Func<TState, Exception, string> formatter)
        {
            if (formatter == null) return;
            var message = formatter(state, exception);
            Logs.Add(message);
        }
    }
}
