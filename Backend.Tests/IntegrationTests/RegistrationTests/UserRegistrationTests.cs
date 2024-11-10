using Backend.DTO;
using Backend.Models;
using Backend.Services;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

public class UserRegistrationTests : UserServicesTestBase
{
    public UserRegistrationTests() : base()
    {

    }

    // Test for creating a user
    [Fact]
    public async Task RegisterUser_ShouldCreateUserAsync()
    {
        Logger.LogInformation("Starting RegisterUser_ShouldCreateUserAsync");
        // Act - Setup user
        var registeredUser = await SetupUserAsync();
        Logger.LogInformation("Completed SetupUserAsync");

        // Assert
        Assert.NotNull(registeredUser);
        Assert.Equal(_userCreationDto.Email, registeredUser.Email);
        Assert.False(registeredUser.EmailConfirmed); // Ensure not yet verified
        Assert.Equal(_userCreationDto.FirstName, registeredUser.FirstName);
        Assert.Equal(_userCreationDto.LastName, registeredUser.LastName);
    }
}