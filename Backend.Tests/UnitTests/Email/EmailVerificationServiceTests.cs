using Backend.Domain.Entities;
using Backend.Tests.Mocks;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

public class EmailVerificationServiceTests : UnitTestBase
{
    private const string NonExistentEmail = "nonexistent@example.com";
    private const string TestEmail = "test@example.com";
    private readonly UserModel _testUser;
    private readonly UserVerificationTrackingModel _tracking;

    public EmailVerificationServiceTests()
    {
        // Common setup for tests
        _testUser = new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() };
        _tracking = new UserVerificationTrackingModel
        {
            DailyResendCount = 0,
            LastResendRequestDate = DateTime.UtcNow.Date,
            LastResendRequestTime = null
        };
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_UserNotFound_ReturnsNotFound()
    {

        // Arrange
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
        // Arrange
        _tracking.DailyResendCount = 3; // Assume limit is 3
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(_testUser);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId)).ReturnsAsync(_tracking);

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
        // Arrange
        _tracking.LastResendRequestTime = DateTime.UtcNow.AddMinutes(-2); // Less than cooldown
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(_testUser);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId)).ReturnsAsync(_tracking);

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
        // Arrange
        var expiredToken = new UserTokenModel { TokenExpiryDate = DateTime.UtcNow.AddMinutes(-10) };
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(_testUser);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId)).ReturnsAsync(_tracking);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTokenByPersoIdAsync(_testUser.PersoId)).ReturnsAsync(expiredToken);
        MockTokenSqlExecutor.Setup(x => x.DeleteUserTokenByPersoidAsync(_testUser.PersoId)).ReturnsAsync(1);

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
        // Arrange
        var expiredToken = new UserTokenModel { TokenExpiryDate = DateTime.UtcNow.AddMinutes(-10) };
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(_testUser);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId)).ReturnsAsync(_tracking);
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTokenByPersoIdAsync(_testUser.PersoId)).ReturnsAsync(expiredToken);
        MockTokenSqlExecutor.Setup(x => x.DeleteUserTokenByPersoidAsync(_testUser.PersoId)).ReturnsAsync(0);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await EmailVerificationService.ResendVerificationEmailAsync(TestEmail));
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_SuccessfulResend_ReturnsSuccess()
    {
        // Arrange
        MockUserSqlExecutor.Setup(x => x.GetUserModelAsync(null, TestEmail)).ReturnsAsync(new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() });
        MockTokenSqlExecutor.Setup(x => x.GetUserVerificationTrackingAsync(It.IsAny<Guid>())).ReturnsAsync(new UserVerificationTrackingModel());

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal("Verification email has been resent.", result.Message);
    }


}
