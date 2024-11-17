using Backend.Application.Services.EmailServices;
using Backend.Domain.Entities;
using Microsoft.Extensions.Options;
using Moq;
using System;
using System.Threading.Tasks;
using Backend.Infrastructure.Data.Sql.UserQueries;
using Backend.Tests.Mocks;
using Xunit;

public class EmailVerificationServiceTests : UnitTestBase
{
    private const string NonExistentEmail = "nonexistent@example.com";
    private const string TestEmail = "test@example.com";

    public EmailVerificationServiceTests()
    {
        // Setup method logic (xUnit uses constructors for setup)
        Setup();
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_UserNotFound_ReturnsNotFound()
    {
        // Arrange: User does not exist in the database
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, NonExistentEmail))
            .ReturnsAsync((UserModel)null);

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(NonExistentEmail);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(404, result.StatusCode);
        Assert.Equal("User not found.", result.Message);
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_DailyLimitExceeded_ReturnsTooManyRequests()
    {
        // Arrange: Daily limit is exceeded for this user
        var user = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        var tracking = new UserVerificationTrackingModel
        {
            DailyResendCount = 3, // Assume daily limit is 3
            LastResendRequestDate = DateTime.UtcNow.Date
        };

        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(user);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(user.PersoId)).ReturnsAsync(tracking);

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(429, result.StatusCode);
        Assert.Equal("Daily resend limit exceeded.", result.Message);
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_CooldownNotMet_ReturnsTooManyRequests()
    {
        // Arrange: Cooldown period has not been met
        var user = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        var tracking = new UserVerificationTrackingModel
        {
            LastResendRequestTime = DateTime.UtcNow.AddMinutes(-2) // Less than cooldown period
        };

        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(user);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(user.PersoId)).ReturnsAsync(tracking);

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(429, result.StatusCode);
        Assert.Equal("Please wait before requesting another verification email.", result.Message);
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_ExpiredTokenDeleted_ReturnsSuccess()
    {
        // Arrange: Expired token exists and is deleted successfully
        var user = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        var token = new UserTokenModel { TokenExpiryDate = DateTime.UtcNow.AddMinutes(-10) }; // Expired token
        var tracking = new UserVerificationTrackingModel();

        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(user);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(user.PersoId)).ReturnsAsync(tracking);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTokenByPersoIdAsync(user.PersoId)).ReturnsAsync(token);
        MockTokenSqlExecutor.Setup(x => x.DeleteUserTokenByPersoidAsync(user.PersoId)).ReturnsAsync(1); // Token deleted

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal("Verification email has been resent.", result.Message);
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_FailedToDeleteExpiredToken_ThrowsException()
    {
        // Arrange: Expired token exists but fails to delete
        var user = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        var token = new UserTokenModel { TokenExpiryDate = DateTime.UtcNow.AddMinutes(-10) }; // Expired token
        var tracking = new UserVerificationTrackingModel();

        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(user);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(user.PersoId)).ReturnsAsync(tracking);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTokenByPersoIdAsync(user.PersoId)).ReturnsAsync(token);
        MockTokenSqlExecutor.Setup(x => x.DeleteUserTokenByPersoidAsync(user.PersoId)).ReturnsAsync(0); // Failed to delete

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await EmailVerificationService.ResendVerificationEmailAsync(TestEmail));
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_SuccessfulResend_ReturnsSuccess()
    {
        // Arrange: Verification email resend is successful
        var user = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        var tracking = new UserVerificationTrackingModel();

        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(user);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(user.PersoId)).ReturnsAsync(tracking);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTokenByPersoIdAsync(user.PersoId)).ReturnsAsync((UserTokenModel)null); // No expired token
        MockEmailService.Setup(x => x.ProcessAndSendEmailAsync(It.IsAny<EmailMessageModel>())).ReturnsAsync(true);

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal("Verification email has been resent.", result.Message);
    }
}
