using Backend.DTO;
using Backend.Models;
using Microsoft.Extensions.DependencyInjection;

public class RegisterAndConfirmUser_WithEmailVerification : UserServicesTestBase
{
    private readonly MockEmailService _mockEmailService;

    public RegisterAndConfirmUser_WithEmailVerification() : base()
    {
        _mockEmailService = ServiceProvider.GetService<IEmailService>() as MockEmailService
                            ?? throw new InvalidOperationException("IEmailService not registered.");
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
            EmailConfirmed = false
        };

        // Act - Register the user
        var registrationResult = await UserServices.CreateNewRegisteredUserAsync(userModel);

        // Assert - Verify user registration was successful
        Assert.True(registrationResult);

        // Act - Send verification email
        var verificationToken = Guid.NewGuid().ToString(); // Generate a mock token
        await _mockEmailService.SendVerificationEmailAsync(userModel.Email, verificationToken);

        // Assert - Verify the email was sent
        Assert.True(_mockEmailService.EmailWasSent, "The verification email should have been sent.");
        Assert.Equal(userModel.Email, _mockEmailService.LastSentEmail); // Check email was sent to correct address
        Assert.Equal(verificationToken, _mockEmailService.LastSentToken); // Ensure the token is correct

        // Act - Update email confirmation status
        userModel.EmailConfirmed = true; // Manually set to verified
        var verificationResult = await UserServices.UpdateEmailConfirmationStatusAsync(userModel);

        // Assert - Verify email confirmation status was updated successfully
        Assert.True(verificationResult);

        // Verify that the user data in the database reflects the changes
        var updatedUser = await UserServices.GetUserForRegistrationByEmailAsync(userModel.Email);
        Assert.NotNull(updatedUser);
        Assert.Equal(userDto.Email, updatedUser.Email);
        Assert.Equal(userDto.FirstName, updatedUser.FirstName);
        Assert.Equal(userDto.LastName, updatedUser.LastName);
        Assert.True(updatedUser.EmailConfirmed); // Ensure user is marked as verified
    }
}
