using Backend.Helpers;
using System;
using System.Threading.Tasks;
using Xunit;

public abstract class VerificationEmailIntegrationTestBase : TestBase, IAsyncLifetime
{
    protected UserVerificationHelper UserVerificationHelper;
    protected Func<DateTime> MockTimeProvider;

    protected VerificationEmailIntegrationTestBase(Func<DateTime>? mockTimeProvider = null)
    {
        MockTimeProvider = mockTimeProvider ?? (() => DateTime.UtcNow); // Default to current time if none provided
        //UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
    }

    public async Task InitializeAsync()
    {
        await ClearDatabaseAsync(); // Prepare a clean state for each test
    }

    public async Task DisposeAsync()
    {
        await ClearDatabaseAsync(); // Clean up after each test
    }

    private async Task ClearDatabaseAsync()
    {
        await UserServices.DeleteUserByEmailAsync("test@example.com");
    }
}
