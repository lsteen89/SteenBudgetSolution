using System;
using Microsoft.Extensions.DependencyInjection;
using Backend.Tests.Mocks;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Backend.Application.Services.UserServices;
using Backend.Application.Services.EmailServices;

public abstract class IntegrationTestBase : IDisposable
{
    protected readonly ServiceProvider ServiceProvider;
    protected readonly IUserSqlExecutor UserSqlExecutor;
    protected readonly UserServices UserServices;
    protected readonly MockEmailService MockEmailService;
    protected readonly EmailVerificationService EmailVerificationService;

    protected IntegrationTestBase()
    {
        var serviceCollection = new ServiceCollection();
        var startup = new StartupTest();
        startup.ConfigureServices(serviceCollection);

        // Build the service provider and retrieve necessary services
        ServiceProvider = serviceCollection.BuildServiceProvider();

        // Use GetRequiredService<IInterface>() to retrieve the dependencies as interfaces
        UserSqlExecutor = ServiceProvider.GetRequiredService<IUserSqlExecutor>();
        UserServices = ServiceProvider.GetRequiredService<UserServices>();
        MockEmailService = ServiceProvider.GetRequiredService<IEmailService>() as MockEmailService
                           ?? throw new InvalidOperationException("MockEmailService not registered.");
        EmailVerificationService = ServiceProvider.GetRequiredService<EmailVerificationService>();
    }

    public void Dispose() => ServiceProvider.Dispose();
}
