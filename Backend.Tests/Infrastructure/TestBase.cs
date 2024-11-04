using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Backend.DataAccess;
using Backend.Helpers;
using Backend.Services;

public abstract class TestBase : IDisposable
{
    protected readonly ServiceProvider ServiceProvider;
    protected readonly SqlExecutor SqlExecutor;
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
        SqlExecutor = ServiceProvider.GetRequiredService<SqlExecutor>();
        UserServices = ServiceProvider.GetRequiredService<UserServices>();
        MockEmailService = ServiceProvider.GetRequiredService<IEmailService>() as MockEmailService
                           ?? throw new InvalidOperationException("MockEmailService not registered.");
        UserVerificationHelper = ServiceProvider.GetRequiredService<UserVerificationHelper>();
    }

    public void Dispose() => ServiceProvider.Dispose();
}
