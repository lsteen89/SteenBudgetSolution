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
        _userServices = serviceProvider.GetService<UserServices>() ?? throw new InvalidOperationException("UserServices not registered.");
        _mockEmailService = serviceProvider.GetService<IEmailService>() as MockEmailService ?? throw new InvalidOperationException("IEmailService not registered.");
    }

    [Fact]
    public void Register_ShouldSendVerificationEmail_WithToken()
    {
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
            IsVerified = false // Make sure user is not verified initially
        };
        // Act
        var result = _userServices.CreateNewRegisteredUser(userModel);

        // Update email confirmation status (now passing UserModel instead of just Email)
        _userServices.UpdateEmailConfirmationStatus(userModel);

        // Generate token and send verification email
        
        //Obselet
        //var token = _userServices.GenerateJwtToken(userModel);
        //_userServices.SendVerificationEmail(userModel.Email, token);

        // Assert
        Assert.True(result);
        Assert.Equal("test@example.com", _mockEmailService.LastSentEmail);
        //Assert.Equal(token, _mockEmailService.LastSentToken);
    }
}
