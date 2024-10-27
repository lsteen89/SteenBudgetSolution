using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Backend.DataAccess;
using Backend.Helpers;
using Backend.Services;

public abstract class UserVerificationTestBase : IAsyncLifetime
{
    protected readonly ServiceProvider ServiceProvider;
    protected readonly SqlExecutor SqlExecutor;
    protected readonly UserServices UserServices;
    protected readonly MockEmailService MockEmailService;
    protected UserVerificationHelper UserVerificationHelper;
    protected Func<DateTime> MockTimeProvider;

    protected UserVerificationTestBase()
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

    public async Task InitializeAsync() => await ClearDatabaseAsync();

    public async Task DisposeAsync()
    {
        await ClearDatabaseAsync();
        ServiceProvider.Dispose();
    }

    private async Task ClearDatabaseAsync()
    {
        await UserServices.DeleteUserByEmailAsync("test@example.com");
    }
}
