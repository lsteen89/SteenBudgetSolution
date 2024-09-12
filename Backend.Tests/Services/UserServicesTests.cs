using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Backend.Services;
using Backend.Models;
using Xunit;
using Backend.DTO;

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
        _userServices = serviceProvider.GetService<UserServices>();

        // Cast IEmailService to MockEmailService
        _mockEmailService = serviceProvider.GetService<IEmailService>() as MockEmailService;
    }

    [Fact]
    public void Register_ShouldSendVerificationEmail_WithToken()
    {
        // Arrange
        var userDto = new UserCreationDto
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!"
        };

        // Act
        var userModel = new UserModel
        {
            FirstName = userDto.FirstName,
            LastName = userDto.LastName,
            Email = userDto.Email,
            Password = userDto.Password
        };
        var result = _userServices.CreateNewRegisteredUser(userModel);

        // Generate token and send verification email
        var user = _userServices.GetUserByEmail(userDto.Email);
        var token = _userServices.GenerateJwtToken(user);
        _userServices.SendVerificationEmail(user.Email, token);

        // Assert
        Assert.True(result);
        Assert.Equal("test@example.com", _mockEmailService.LastSentEmail);
        Assert.Equal(token, _mockEmailService.LastSentToken);
    }
}
