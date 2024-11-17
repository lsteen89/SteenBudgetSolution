using Backend.Application.Services.EmailServices;
using Backend.Application.Settings;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using NUnit.Framework;
using System;

public abstract class UnitTestBase
{
    protected IServiceProvider ServiceProvider;
    protected Mock<IUserSqlExecutor> MockUserSqlExecutor;
    protected Mock<ITokenSqlExecutor> MockTokenSqlExecutor;
    protected Mock<IEmailService> MockEmailService;
    protected EmailVerificationService EmailVerificationService;

    [SetUp]
    public void Setup()
    {
        var services = new ServiceCollection();

        // Initialize mocks
        MockUserSqlExecutor = new Mock<IUserSqlExecutor>();
        MockTokenSqlExecutor = new Mock<ITokenSqlExecutor>();
        MockEmailService = new Mock<IEmailService>();
        var mockSendVerificationEmailFunc = new Mock<Func<string, Task<bool>>>();

        mockSendVerificationEmailFunc
            .Setup(func => func(It.IsAny<string>()))
            .ReturnsAsync(true);

        // Register mock instances directly
        services.AddSingleton(MockUserSqlExecutor.Object);
        services.AddSingleton(MockTokenSqlExecutor.Object);
        services.AddSingleton(MockEmailService.Object);

        // Configure options
        var mockOptions = Options.Create(new ResendEmailSettings { CooldownPeriodMinutes = 5, DailyLimit = 3 });
        services.AddSingleton(mockOptions);

        // Register EmailVerificationService with DI container
        services.AddScoped(provider => new EmailVerificationService(
            MockUserSqlExecutor.Object,
            MockTokenSqlExecutor.Object,
            MockEmailService.Object,
            mockOptions,
            provider.GetRequiredService<ILogger<EmailVerificationService>>(),
            mockSendVerificationEmailFunc.Object, 
            () => DateTime.UtcNow));

        // Add logging to avoid potential dependency resolution issues
        services.AddLogging();

        // Build the service provider
        ServiceProvider = services.BuildServiceProvider();
        EmailVerificationService = ServiceProvider.GetRequiredService<EmailVerificationService>();
    }
}
