using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Backend.Services;
using Backend.Models;
using Xunit;
using Backend.DTO;
using System.Threading.Tasks;

public class UserServicesTests
{
    private readonly UserServices _userServices;
    private readonly MockEmailService _mockEmailService;

    public UserServicesTests()
    {
        var serviceCollection = new ServiceCollection();
        var startup = new StartupTest();
        startup.ConfigureServices(serviceCollection);

        var serviceProvider = serviceCollection.BuildServiceProvider();
        _userServices = serviceProvider.GetService<UserServices>() ?? throw new InvalidOperationException("UserServices not registered.");
        _mockEmailService = serviceProvider.GetService<IEmailService>() as MockEmailService ?? throw new InvalidOperationException("IEmailService not registered.");
    }

    [Fact]
    public async Task RegisterAndVerifyUser_ShouldCreateAndSetUserAsVerifiedAsync()
    {
        // Arrange
        var userDto = new UserCreationDto
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var userModel = new UserModel
        {
            FirstName = userDto.FirstName,
            LastName = userDto.LastName,
            Email = userDto.Email,
            Password = userDto.Password,
            EmailConfirmed = false // Ensure the user is not verified initially
        };

        // Act - Register the user
        var registrationResult = await _userServices.CreateNewRegisteredUserAsync(userModel);

        // Assert - Verify user registration was successful
        Assert.True(registrationResult);

        // Act - Update email confirmation status
        userModel.EmailConfirmed = true; // Manually set to verified
        var verificationResult = await _userServices.UpdateEmailConfirmationStatusAsync(userModel);

        // Assert - Verify email confirmation status was updated successfully
        Assert.True(verificationResult);

        // Verify that the user data in the database reflects the changes
        var updatedUser = await _userServices.GetUserForRegistrationByEmailAsync(userModel.Email);
        Assert.NotNull(updatedUser);
        Assert.Equal(userDto.Email, updatedUser.Email);
        Assert.Equal(userDto.FirstName, updatedUser.FirstName);
        Assert.Equal(userDto.LastName, updatedUser.LastName);
        Assert.True(updatedUser.EmailConfirmed); // Ensure user is marked as verified
    }




}
