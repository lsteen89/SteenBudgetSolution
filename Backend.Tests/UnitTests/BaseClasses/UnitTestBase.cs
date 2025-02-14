using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Services.UserServices;
using Backend.Application.Settings;
using Backend.Common.Interfaces;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Tests.Mocks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

public abstract class UnitTestBase
{
    protected IServiceProvider ServiceProvider;
    protected Mock<IUserSQLProvider> MockUserSQLProvider;
    protected EmailVerificationService EmailVerificationService;
    protected Mock<IHttpContextAccessor> MockHttpContextAccessor;
    protected Mock<ILogger<UserAuthenticationService>> LoggerMockAuth;
    protected Mock<IConfiguration> MockConfiguration;
    protected Mock<ILogger<UserServices>> LoggerMock;
    protected Mock<IEnvironmentService> MockEnvironmentService;
    protected Mock<IUserTokenService> MockUserTokenService;
    protected Mock<HttpContext> MockHttpContext;
    protected Mock<HttpResponse> MockHttpResponse;
    protected UserServices UserServicesInstance;
    protected Mock<IEmailResetPasswordService> MockEmailResetPasswordService;
    protected Dictionary<string, (string Value, CookieOptions Options)> CookiesContainer;
    protected Mock<ILogger<UserManagementService>> LoggerMockUserManagementService;
    protected UserManagementService UserManagementServiceInstance;
    protected UserAuthenticationService UserAuthenticationServiceInstance;

    protected UserAuthenticationService _userAuthenticationService;

    public UnitTestBase()
    {
        Setup();
    }

    public void Setup()
    {
        var services = new ServiceCollection();

        // Initialize mocks
        MockUserSQLProvider = new Mock<IUserSQLProvider>();
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

        // Mock provider internals for UserSQLProvider
        MockUserSQLProvider
            .Setup(provider => provider.UserSqlExecutor)
            .Returns(Mock.Of<IUserSqlExecutor>());
        MockUserSQLProvider
            .Setup(provider => provider.TokenSqlExecutor)
            .Returns(Mock.Of<IVerificationTokenSqlExecutor>());
        MockUserSQLProvider
            .Setup(provider => provider.AuthenticationSqlExecutor)
            .Returns(Mock.Of<IAuthenticationSqlExecutor>());

        // Mock Configuration
        var mockConfiguration = new Mock<IConfiguration>();
        mockConfiguration.Setup(config => config["JWT_SECRET_KEY"]).Returns("YourTestJwtSecretKey12345678901234567856456");


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
        LoggerMockUserManagementService = new Mock<ILogger<UserManagementService>>(); // Mock logger for UserManagementService

        services.AddScoped<IUserSQLProvider>(_ => MockUserSQLProvider.Object);
        services.AddScoped<IEmailResetPasswordService>(_ => MockEmailResetPasswordService.Object);

        // Register MockEmailService as the real implementation of IEmailService
        services.AddScoped<IEmailService>(_ => new MockEmailService(
            mockLoggerForMockEmailService,
            mockEmailPreparationService
        ));

        // Register UserManagementService
        services.AddScoped<IUserManagementService>(_ =>
        {
            return new UserManagementService(
                MockUserSQLProvider.Object,
                LoggerMockUserManagementService.Object
            );
        });

        // Register UserAuthenticationService
        // Register UserAuthenticationService
        services.AddScoped<IUserAuthenticationService>(_ => new UserAuthenticationService(
            MockUserSQLProvider.Object,
            MockEnvironmentService.Object,
            MockUserTokenService.Object,
            MockEmailResetPasswordService.Object,
            MockHttpContextAccessor.Object,
            MockConfiguration.Object,
            LoggerMockAuth.Object
        ));



        var mockOptions = Options.Create(new ResendEmailSettings { CooldownPeriodMinutes = 5, DailyLimit = 3 });
        services.AddSingleton(mockOptions);

        services.AddScoped<IEmailVerificationService>(_ => new EmailVerificationService(
            MockUserSQLProvider.Object,
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
                MockUserSQLProvider.Object,
                LoggerMock.Object
            );
        });

        // Build ServiceProvider
        ServiceProvider = services.BuildServiceProvider();

        // Resolve services for testing
        EmailVerificationService = ServiceProvider.GetRequiredService<IEmailVerificationService>() as EmailVerificationService;
        UserServicesInstance = ServiceProvider.GetRequiredService<IUserServices>() as UserServices;
        UserManagementServiceInstance = ServiceProvider.GetRequiredService<IUserManagementService>() as UserManagementService;
        UserAuthenticationServiceInstance = ServiceProvider.GetRequiredService<IUserAuthenticationService>() as UserAuthenticationService;

        // Assertions to validate setup
        Assert.NotNull(EmailVerificationService);
        Assert.NotNull(ServiceProvider.GetRequiredService<IEmailService>());
    }
    protected void SetupUserAuthenticationServiceWithMocks()
    {
        // Resolve real implementations of shared dependencies
        var emailResetPasswordService = ServiceProvider.GetRequiredService<IEmailResetPasswordService>();

        // Initialize UserAuthenticationService with pre-configured mocks
        _userAuthenticationService = new UserAuthenticationService(
            MockUserSQLProvider.Object,             // Mocked IUserSQLProvider
            MockEnvironmentService.Object,          // Mocked IEnvironmentService
            MockUserTokenService.Object,            // Mocked IUserTokenService
            emailResetPasswordService,              // Real IEmailResetPasswordService
            MockHttpContextAccessor.Object,         // Mocked IHttpContextAccessor
            MockConfiguration.Object,               // Mocked IConfiguration
            LoggerMockAuth.Object                   // Mocked ILogger
        );
    }
}
