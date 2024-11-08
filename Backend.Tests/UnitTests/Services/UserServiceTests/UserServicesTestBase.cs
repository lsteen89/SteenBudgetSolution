using Backend.DataAccess;
using Backend.Models;
using Backend.Services;
using System.Threading.Tasks;
using Xunit;

public abstract class UserServicesTestBase : TestBase, IAsyncLifetime
{
    protected Guid TestUserPersoId { get; private set; }
    protected async Task PrepareUserDataAsync()
    {
        // Seed a user with EmailConfirmed set to false
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            Password = "Password123!",
            Roles = "1"
        };
        TestUserPersoId = user.PersoId;
        await SqlExecutor.InsertNewUserDatabaseAsync(user);

        var tokenModel = await UserServices.CreateEmailTokenAsync(user.PersoId);

        bool tokenInserted = await UserServices.InsertUserTokenAsync(tokenModel);
    }
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
        await UserServices.DeleteUserTokenByEmailAsync(TestUserPersoId);
    }
}
