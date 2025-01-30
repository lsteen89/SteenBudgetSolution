using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Settings;
using Backend.Domain.Entities;
using Backend.Tests.Mocks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Backend.Tests.UnitTests.Email;
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
        MockUserSQLProvider.Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, NonExistentEmail))
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
        _tracking.LastResendRequestDate = DateTime.UtcNow.Date; // Ensure same day for the check
        MockUserSQLProvider
            .Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, TestEmail))
            .ReturnsAsync(_testUser);

        MockUserTokenService
            .Setup(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId))
            .ReturnsAsync(_tracking);

        MockUserTokenService
            .Setup(x => x.InsertUserVerificationTrackingAsync(It.IsAny<UserVerificationTrackingModel>()))
            .Returns(Task.CompletedTask); // Simulate successful insertion

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(429, result.StatusCode);
        Assert.Equal("Daily resend limit exceeded.", result.Message);

        // Verify that InsertUserVerificationTrackingAsync is not called
        MockUserTokenService.Verify(x => x.InsertUserVerificationTrackingAsync(It.IsAny<UserVerificationTrackingModel>()), Times.Never);

        // Verify that GetUserVerificationTrackingAsync is called
        MockUserTokenService.Verify(x => x.GetUserVerificationTrackingAsync(_testUser.PersoId), Times.Once);
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_CooldownNotMet_ReturnsTooManyRequests()
    {
        // Arrange
        var cooldownPeriod = TimeSpan.FromMinutes(5);
        var currentTime = DateTime.UtcNow;

        var tracking = new UserVerificationTrackingModel
        {
            PersoId = Guid.NewGuid(),
            LastResendRequestTime = currentTime.AddMinutes(-2),
            LastResendRequestDate = currentTime.Date
        };
        MockUserSQLProvider.Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, TestEmail))
            .ReturnsAsync(_testUser);
        MockUserTokenService
            .Setup(x => x.GetUserVerificationTrackingAsync(It.IsAny<Guid>()))
            .ReturnsAsync(tracking);

        var mockOptions = Options.Create(new ResendEmailSettings
        {
            CooldownPeriodMinutes = 5,
            DailyLimit = 3
        });

        EmailVerificationService = new EmailVerificationService(
            MockUserSQLProvider.Object,
            MockUserTokenService.Object,
            ServiceProvider.GetRequiredService<IEmailService>(),
            mockOptions,
            Mock.Of<ILogger<EmailVerificationService>>(),
            new Mock<IEmailPreparationService>().Object,
            () => currentTime
        );

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(429, result.StatusCode);
        Assert.Equal("Please wait before requesting another verification email.", result.Message);

        MockUserTokenService.Verify(x => x.GetUserVerificationTrackingAsync(It.IsAny<Guid>()), Times.Once);
    }



    [Fact]
    public async Task ResendVerificationEmailAsync_ExpiredTokenDeleted_ReturnsSuccess()
    {
        // Arrange
        var expiredToken = new UserTokenModel { TokenExpiryDate = DateTime.UtcNow.AddMinutes(-10) };
        MockUserSQLProvider.Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, TestEmail))
            .ReturnsAsync(_testUser);

        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.GetUserVerificationTrackingAsync(_testUser.PersoId))
            .ReturnsAsync(_tracking);

        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.GetUserVerificationTokenByPersoIdAsync(_testUser.PersoId))
            .ReturnsAsync(expiredToken);

        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.DeleteUserTokenByPersoidAsync(_testUser.PersoId))
            .ReturnsAsync(1); // Simulate successful deletion

        MockUserTokenService.Setup(service => service.CreateEmailTokenAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new UserTokenModel { Token = Guid.NewGuid() });

        MockUserTokenService.Setup(service => service.InsertUserTokenAsync(It.IsAny<UserTokenModel>()))
            .ReturnsAsync(true); // Simulate successful token insertion

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
        MockUserSQLProvider.Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, TestEmail)).ReturnsAsync(_testUser);
        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.GetUserVerificationTrackingAsync(_testUser.PersoId)).ReturnsAsync(_tracking);
        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.GetUserVerificationTokenByPersoIdAsync(_testUser.PersoId)).ReturnsAsync(expiredToken);
        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.DeleteUserTokenByPersoidAsync(_testUser.PersoId)).ReturnsAsync(0);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await EmailVerificationService.ResendVerificationEmailAsync(TestEmail));
    }

    [Fact]
    public async Task ResendVerificationEmailAsync_SuccessfulResend_ReturnsSuccess()
    {
        // Arrange
        MockUserSQLProvider.Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, TestEmail))
            .ReturnsAsync(new UserModel { Email = TestEmail, PersoId = Guid.NewGuid() });

        MockUserSQLProvider.Setup(x => x.TokenSqlExecutor.GetUserVerificationTrackingAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new UserVerificationTrackingModel());

        MockUserTokenService.Setup(service => service.CreateEmailTokenAsync(It.IsAny<Guid>()))
            .ReturnsAsync(new UserTokenModel { Token = Guid.NewGuid() });

        MockUserTokenService.Setup(service => service.InsertUserTokenAsync(It.IsAny<UserTokenModel>()))
            .ReturnsAsync(true); // Simulate successful token insertion

        // Act
        var result = await EmailVerificationService.ResendVerificationEmailAsync(TestEmail);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(200, result.StatusCode);
        Assert.Equal("Verification email has been resent.", result.Message);

        // Verify that the necessary methods were called
        MockUserTokenService.Verify(service => service.CreateEmailTokenAsync(It.IsAny<Guid>()), Times.Once);
        MockUserTokenService.Verify(service => service.InsertUserTokenAsync(It.IsAny<UserTokenModel>()), Times.Once);

    }


}
