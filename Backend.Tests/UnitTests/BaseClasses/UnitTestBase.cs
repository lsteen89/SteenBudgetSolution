using Backend.Application.Services.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Application.Settings;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Backend.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using System;
using Microsoft.Extensions.Configuration;
using Backend.Infrastructure.Interfaces;

public abstract class UnitTestBase
{
    protected IServiceProvider ServiceProvider;
    protected Mock<IUserSqlExecutor> MockUserSqlExecutor;
    protected Mock<ITokenSqlExecutor> MockTokenSqlExecutor;
    protected Mock<IEmailService> MockEmailService;
    protected EmailVerificationService EmailVerificationService;
    protected Mock<IHttpContextAccessor> MockHttpContextAccessor;
    protected Mock<HttpContext> MockHttpContext;
    protected Mock<HttpResponse> MockHttpResponse;
    protected Mock<IConfiguration> MockConfiguration;
    protected Mock<ILogger<UserServices>> LoggerMock;
    protected UserServices UserServicesInstance;
    protected TokenService TokenServiceInstance;
    protected Dictionary<string, (string Value, CookieOptions Options)> CookiesContainer;
    protected Mock<IEnvironmentService> MockEnvironmentService;

    [SetUp]
    public void Setup()
    {
        var services = new ServiceCollection();

        // Initialize mocks
        MockUserSqlExecutor = new Mock<IUserSqlExecutor>();
        MockTokenSqlExecutor = new Mock<ITokenSqlExecutor>();
        MockEmailService = new Mock<IEmailService>();
        MockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        MockHttpContext = new Mock<HttpContext>();
        MockHttpResponse = new Mock<HttpResponse>();
        MockConfiguration = new Mock<IConfiguration>();
        LoggerMock = new Mock<ILogger<UserServices>>();
        MockEnvironmentService = new Mock<IEnvironmentService>();

        CookiesContainer = new Dictionary<string, (string Value, CookieOptions Options)>();

        MockConfiguration
            .Setup(config => config["JWT_SECRET_KEY"])
            .Returns("YourTestJwtSecretKey12345678901234567856456");
        
        MockEnvironmentService
            .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
            .Returns("Development");
        
        // Capture cookies during tests
        MockHttpResponse
            .Setup(r => r.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()))
            .Callback<string, string, CookieOptions>((key, value, options) =>
            {
                CookiesContainer[key] = (value, options);
            });

        MockHttpContext
            .Setup(c => c.Response)
            .Returns(MockHttpResponse.Object);

        MockHttpContextAccessor
            .Setup(a => a.HttpContext)
            .Returns(MockHttpContext.Object);

        // Real TokenService
        TokenServiceInstance = new TokenService(MockConfiguration.Object);
        services.AddSingleton(TokenServiceInstance);

        // Configure options
        var mockOptions = Options.Create(new ResendEmailSettings { CooldownPeriodMinutes = 5, DailyLimit = 3 });
        services.AddSingleton(mockOptions);

        // Register EmailVerificationService
        services.AddScoped(provider => new EmailVerificationService(
            MockUserSqlExecutor.Object,
            MockTokenSqlExecutor.Object,
            MockEmailService.Object,
            mockOptions,
            Mock.Of<ILogger<EmailVerificationService>>(),
            Mock.Of<Func<string, Task<bool>>>(func => func(It.IsAny<string>()) == Task.FromResult(true)),
            () => DateTime.UtcNow));

        // Register UserServices
        services.AddScoped(provider => new UserServices(
            MockUserSqlExecutor.Object,
            MockTokenSqlExecutor.Object,
            MockConfiguration.Object,
            MockEmailService.Object,
            LoggerMock.Object,
            provider.GetRequiredService<EmailVerificationService>(),
            TokenServiceInstance,
            MockHttpContextAccessor.Object,
            MockEnvironmentService.Object)
        );

        // Build ServiceProvider
        ServiceProvider = services.BuildServiceProvider();

        // Resolve services for use in tests
        EmailVerificationService = ServiceProvider.GetRequiredService<EmailVerificationService>();
        UserServicesInstance = ServiceProvider.GetRequiredService<UserServices>();
    }
}

