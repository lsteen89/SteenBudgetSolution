using Microsoft.Extensions.DependencyInjection;
using System;
using System.Threading.Tasks;
using Backend.Services;
using Xunit;

public abstract class UserServicesTestBase : IAsyncLifetime
{
    protected readonly IServiceProvider ServiceProvider;
    protected readonly UserServices UserServices;

    protected UserServicesTestBase()
    {
        var serviceCollection = new ServiceCollection();
        var startup = new StartupTest();
        startup.ConfigureServices(serviceCollection);

        ServiceProvider = serviceCollection.BuildServiceProvider();
        UserServices = ServiceProvider.GetService<UserServices>() ?? throw new InvalidOperationException("UserServices not registered.");
    }

    public async Task InitializeAsync()
    {
        await ClearDatabaseAsync(); // Clear any pre-existing data
    }

    public async Task DisposeAsync()
    {
        await ClearDatabaseAsync(); // Clean up test data
    }

    private async Task ClearDatabaseAsync()
    {
        // Delete test users and any other data set by tests
        await UserServices.DeleteUserByEmailAsync("test@example.com"); 
    }
}
