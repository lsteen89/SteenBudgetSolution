using Xunit;
using System.Threading.Tasks;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Microsoft.Extensions.DependencyInjection;
using Backend.DTO;
using Backend.DataAccess;

public class UserVerificationHelperIntegrationTests : UserVerificationTestBase
{
    private readonly UserVerificationHelper _helper;
    private readonly MockEmailService _mockEmailService;

    public UserVerificationHelperIntegrationTests() : base()
    {
        _helper = ServiceProvider.GetRequiredService<UserVerificationHelper>();
        _mockEmailService = ServiceProvider.GetRequiredService<IEmailService>() as MockEmailService
                            ?? throw new InvalidOperationException("MockEmailService not registered.");
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceDailyLimit()
    {
        // Arrange
        var mockTime = new DateTime(2023, 1, 1, 12, 0, 0); // Start time
        MockTimeProvider = () => mockTime; // Set initial time for mock provider
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);

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
        await SqlExecutor.InsertNewUserDatabaseAsync(userModel);

        // Act - Send the verification email three times, each with a 16-minute increment
        var firstResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(firstResult.IsSuccess);

        // Advance time by 16 minutes
        mockTime = mockTime.AddMinutes(16);
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
        var secondResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(secondResult.IsSuccess);

        // Advance time by another 16 minutes
        mockTime = mockTime.AddMinutes(16);
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
        var thirdResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(thirdResult.IsSuccess);
        Assert.Equal("Verification email has been resent.", thirdResult.Message);

        // Act - Attempt a fourth resend, which should fail due to daily limit
        mockTime = mockTime.AddMinutes(16);
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
        var fourthResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - The fourth send should be blocked
        Assert.False(fourthResult.IsSuccess);
        Assert.Equal("Daily resend limit exceeded.", fourthResult.Message);

        // Additional Assert: Verify the last email sent was the third one
        Assert.True(MockEmailService.EmailWasSent); // Email was sent during the first three attempts
        Assert.Equal(userModel.Email, MockEmailService.LastSentEmail); // Last email matches the user email
    }
    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceCooldownPeriod()
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
        await SqlExecutor.InsertNewUserDatabaseAsync(userModel);

        // Act - Send the first verification email (should succeed)
        var firstResult = await _helper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - Verify the first send succeeded
        Assert.True(firstResult.IsSuccess);
        Assert.Equal("Verification email has been resent.", firstResult.Message);

        // Act - Attempt a second resend within the cooldown period
        var secondResult = await _helper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - The second send should fail due to the cooldown
        Assert.False(secondResult.IsSuccess);
        Assert.Equal("Please wait before requesting another verification email.", secondResult.Message);

        // Additional Assert: Verify only the first email was sent
        Assert.True(_mockEmailService.EmailWasSent); // Email was sent on the first attempt
        Assert.Equal(userModel.Email, _mockEmailService.LastSentEmail); // Last email matches the user email
    }
    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceCooldownPeriodWithMockTime()
    {
        // Arrange
        MockTimeProvider = () => new DateTime(2023, 1, 1, 12, 0, 0);
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);

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
        await SqlExecutor.InsertNewUserDatabaseAsync(userModel);

        // Act - First attempt to send (should succeed)
        var firstResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - First attempt is successful
        Assert.True(firstResult.IsSuccess);
        Assert.Equal("Verification email has been resent.", firstResult.Message);

        // Act - Simulate a second attempt within the cooldown period by advancing time by 10 minutes
        MockTimeProvider = () => new DateTime(2023, 1, 1, 12, 10, 0); // Update mock time by 10 minutes
        UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
        var secondResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - Second attempt fails due to cooldown
        Assert.False(secondResult.IsSuccess);
        Assert.Equal("Please wait before requesting another verification email.", secondResult.Message);
    }
}
