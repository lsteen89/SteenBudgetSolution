using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Backend.Tests.Mocks;
using Backend.Infrastructure.Data;
using Backend.Application.Services.UserServices;
using Backend.Infrastructure.Helpers;
using Backend.Infrastructure.Data.Sql.UserQueries;
public abstract class TestBase : IDisposable
{
    protected readonly ServiceProvider ServiceProvider;
    private readonly UserSqlExecutor UserSqlExecutor;
    protected readonly UserServices UserServices;
    protected readonly MockEmailService MockEmailService;
    protected readonly UserVerificationHelper UserVerificationHelper;

    protected TestBase()
    {
        var serviceCollection = new ServiceCollection();
        var startup = new StartupTest();
        startup.ConfigureServices(serviceCollection);

        // Build the service provider and retrieve necessary services
        ServiceProvider = serviceCollection.BuildServiceProvider();
        UserSqlExecutor = ServiceProvider.GetRequiredService<UserSqlExecutor>();
        UserServices = ServiceProvider.GetRequiredService<UserServices>();
        MockEmailService = ServiceProvider.GetRequiredService<IEmailService>() as MockEmailService
                           ?? throw new InvalidOperationException("MockEmailService not registered.");
        UserVerificationHelper = ServiceProvider.GetRequiredService<UserVerificationHelper>();
    }

    public void Dispose() => ServiceProvider.Dispose();
}
