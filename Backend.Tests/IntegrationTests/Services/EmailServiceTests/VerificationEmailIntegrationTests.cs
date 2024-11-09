using Xunit;
using System;
using System.Threading.Tasks;
using Backend.Helpers;
using Backend.Models;
using Backend.Services;
using Backend.DTO;
using Backend.DataAccess;

public class VerificationEmailIntegrationTests : VerificationEmailIntegrationTestBase
{
    private const string SuccessMessage = "Verification email has been resent.";
    private const string CooldownMessage = "Please wait before requesting another verification email.";
    private const string DailyLimitMessage = "Daily resend limit exceeded.";

    public VerificationEmailIntegrationTests()
        : base(() => new DateTime(2023, 1, 1, 12, 0, 0))
    {
    }

    private async Task<UserModel> CreateUserAsync()
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
            EmailConfirmed = false
        };
        await SqlExecutor.InsertNewUserDatabaseAsync(userModel);
        return userModel;
    }

    private void SetMockTime(DateTime mockTime)
    {
        MockTimeProvider = () => mockTime;
        //UserVerificationHelper = new UserVerificationHelper(SqlExecutor, MockEmailService, MockTimeProvider);
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceDailyLimit()
    {
        // Arrange
        var userModel = await CreateUserAsync();
        var mockTime = new DateTime(2023, 1, 1, 12, 0, 0);

        SetMockTime(mockTime);
        var firstResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(firstResult.IsSuccess);

        // Act - Send email three times, each 16 minutes apart
        for (int i = 0; i < 2; i++)
        {
            mockTime = mockTime.AddMinutes(16);
            SetMockTime(mockTime);
            var result = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
            Assert.True(result.IsSuccess);
        }

        // Act - Fourth send should fail due to daily limit
        mockTime = mockTime.AddMinutes(16);
        SetMockTime(mockTime);
        var fourthResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - Fourth send fails, daily limit reached
        Assert.False(fourthResult.IsSuccess);
        Assert.Equal(DailyLimitMessage, fourthResult.Message);
        Assert.True(MockEmailService.EmailWasSent);
        Assert.Equal(userModel.Email, MockEmailService.LastSentEmail);
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceCooldownPeriod()
    {
        // Arrange
        var userModel = await CreateUserAsync();

        // Act - First send should succeed
        var firstResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(firstResult.IsSuccess);
        Assert.Equal(SuccessMessage, firstResult.Message);

        // Act - Second send within cooldown period should fail
        var secondResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - Second send fails due to cooldown
        Assert.False(secondResult.IsSuccess);
        Assert.Equal(CooldownMessage, secondResult.Message);
        Assert.True(MockEmailService.EmailWasSent);
        Assert.Equal(userModel.Email, MockEmailService.LastSentEmail);
    }

    [Fact]
    public async Task ResendVerificationEmail_ShouldEnforceCooldownPeriodWithMockTime()
    {
        // Arrange
        var userModel = await CreateUserAsync();

        // Act - First send should succeed
        SetMockTime(new DateTime(2023, 1, 1, 12, 0, 0));
        var firstResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);
        Assert.True(firstResult.IsSuccess);
        Assert.Equal(SuccessMessage, firstResult.Message);

        // Act - Advance time by 10 minutes (within cooldown) and attempt resend
        SetMockTime(new DateTime(2023, 1, 1, 12, 10, 0));
        var secondResult = await UserVerificationHelper.ResendVerificationEmailAsync(userModel.Email);

        // Assert - Second send fails due to cooldown
        Assert.False(secondResult.IsSuccess);
        Assert.Equal(CooldownMessage, secondResult.Message);
    }
}
