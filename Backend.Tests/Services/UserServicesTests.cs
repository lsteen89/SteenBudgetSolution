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
    public async Task Register_ShouldSendVerificationEmail_WithTokenAsync()
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
            IsVerified = false // Ensure the user is not verified initially
        };

        // Act
        var result = await _userServices.CreateNewRegisteredUserAsync(userModel);

        // Update email confirmation status (now passing UserModel instead of just Email)
        await _userServices.UpdateEmailConfirmationStatusAsync(userModel);

        // Assert - Check if the user registration was successful
        Assert.True(result);

        // Assert - Check if the verification email was sent with the expected email and token
        Assert.Equal("test@example.com", _mockEmailService.LastSentEmail);
        Assert.NotNull(_mockEmailService.LastSentToken); // Check if the token was set correctly in the email
    }
}
