using Backend.Infrastructure.Data;
using System.Threading.Tasks;
using Xunit;
using System;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Backend.Helpers.TestClasses.UserTests.Backend.Helpers.TestClasses.UserTests;
using Backend.Domain.Entities;
using Backend.Application.Services.UserServices;
using Backend.Application.DTO;
public abstract class UserServicesTestBase : IntegrationTestBase, IAsyncLifetime
{
    protected readonly ILogger<UserServicesTestBase> Logger;
    protected UserCreationDto _userCreationDto;
    protected readonly UserServices UserServices;
    protected readonly UserServiceTest UserServiceTest;
    protected Guid TestUserPersoId { get; private set; }
    protected UserServicesTestBase()
    {
        // Get the logger from the service provider
        Logger = ServiceProvider.GetRequiredService<ILogger<UserServicesTestBase>>();
        UserServices = ServiceProvider.GetRequiredService<UserServices>();
        UserServiceTest = ServiceProvider.GetRequiredService<UserServiceTest>();
    }
    protected async Task<UserModel> RegisterUserAsync(UserCreationDto userCreationDto)
    {
        Logger.LogInformation("Starting RegisterUserAsync - Seeding User");

        // Attempt to register the user
        Logger.LogInformation("Calling UserServices.RegisterUserAsync");
        var registrationResult = await UserServices.RegisterUserAsync(userCreationDto);
        Logger.LogInformation("UserServices.RegisterUserAsync completed with result: {Result}", registrationResult);

        // Fetch the newly created user
        Logger.LogInformation("Calling UserServices.GetUserModelAsync to fetch registered user");
        var registeredUser = await UserServices.GetUserModelAsync(email: userCreationDto.Email);
        Logger.LogInformation("UserServices.GetUserModelAsync completed");

        return registeredUser;
    }
    protected async Task<UserTokenModel> GenerateAndInsertTokenAsync(Guid persoId)
    {
        // Generate a token and insert it into the database
        var tokenModel = await UserServices.CreateEmailTokenAsync(persoId);
        await UserServices.InsertUserTokenAsync(tokenModel);
        return tokenModel;
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
    protected async Task<UserModel> SetupUserAsync()
    {
        Logger.LogInformation("Starting SetupUserAsync");
        _userCreationDto = new UserCreationDto
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!",
            CaptchaToken = "mock-captcha-token"
        };
        Logger.LogInformation("Completed RegisterUserAsync in SetupUserAsync");
        return await RegisterUserAsync(_userCreationDto);
    }
}
