using System.Threading.Tasks;
using Xunit;

public abstract class UserServicesTestBase : TestBase, IAsyncLifetime
{
    public async Task InitializeAsync()
    {
        await ClearDatabaseAsync(); // Prepare a clean state
    }

    public async Task DisposeAsync()
    {
        await ClearDatabaseAsync(); // Clean up test data
    }

    private async Task ClearDatabaseAsync()
    {
        // Custom logic to clear user data in the database
        await UserServices.DeleteUserByEmailAsync("test@example.com");
    }
}
