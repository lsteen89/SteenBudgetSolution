using Backend.DTO;
using Backend.Models;
using Backend.Services;
using Microsoft.Extensions.DependencyInjection;

public class RegisterAndConfirmUser_WithEmailVerification : UserServicesTestBase
{
    private readonly MockEmailService _mockEmailService;

    public RegisterAndConfirmUser_WithEmailVerification() : base()
    {
        _mockEmailService = ServiceProvider.GetService<IEmailService>() as MockEmailService
                            ?? throw new InvalidOperationException("IEmailService not registered.");
    }
    // Test for registration flow
    [Fact]
    public async Task RegisterUser_ShouldCreateUserAsync()
    {
        // Arrange
        var userCreationDto = new UserCreationDto
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@example.com",
            Password = "Password123!",
            CaptchaToken = "mock-captcha-token"
        };

        // Act - Register the user
        var registrationResult = await UserServices.RegisterUserAsync(userCreationDto);

        // Fetch the newly created user to verify registration details
        var registeredUser = await UserServices.GetUserModelAsync(email: userCreationDto.Email);
        // Assert
        Assert.True(registrationResult);
        Assert.NotNull(registeredUser);
        Assert.Equal(userCreationDto.Email, registeredUser.Email);
        Assert.False(registeredUser.EmailConfirmed); // Ensure not yet verified
        Assert.Equal(userCreationDto.FirstName, registeredUser.FirstName);
        Assert.Equal(userCreationDto.LastName, registeredUser.LastName);
    }
    [Fact]
    public async Task VerifyUser_ShouldSetEmailConfirmedToTrueAsync()
    {
        // Arrange
        await PrepareUserDataAsync(); // Inserts user and token
        var user = await UserServices.GetUserModelAsync(email: "test@example.com");

        // Act - Simulate verification
        var tokenModel = await UserServices.GetUserVerificationTokenDataAsync(persoid: user.PersoId);
        var verificationResult = await UserServices.VerifyEmailTokenAsync(tokenModel.Token);

        // Assert
        Assert.True(verificationResult);
        var verifiedUser = await UserServices.GetUserModelAsync(email: "test@example.com");
        Assert.True(verifiedUser.EmailConfirmed); // Confirm email was verified
    }
}
