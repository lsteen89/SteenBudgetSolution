using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Domain.Entities.User;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using Xunit;
using System.IdentityModel.Tokens.Jwt;

namespace Backend.Tests.IntegrationTests.Services.UserAuthentication
{
    public class UserAuthenticationServiceTests : UnitTestBase
    {
        private readonly UserAuthenticationService _userAuthenticationService;
        private readonly UserModel _testUser;

        public UserAuthenticationServiceTests()
        {
            _userAuthenticationService = new UserAuthenticationService(
                MockUserSQLProvider.Object, // Mocked provider,
            MockEnvironmentService.Object,
            MockUserTokenService.Object,
            ServiceProvider.GetRequiredService<IEmailResetPasswordService>(),
            MockTokenBlacklistService.Object,
            MockHttpContextAccessor.Object,
            MockConfiguration.Object,
                LoggerMockAuth.Object
            );

            _testUser = new UserModel
            {
                Email = "test@example.com",
                PersoId = Guid.NewGuid()
            };
        }

        [Fact]
        public async Task SendResetPasswordEmailAsync_UserNotFound_ReturnsTrue()
        {
            // Arrange
            var email = "nonexistent@example.com";
            MockUserSQLProvider
                .Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, email))
                .ReturnsAsync((UserModel)null);

            // Act
            var result = await _userAuthenticationService.SendResetPasswordEmailAsync(email);

            // Assert
            Assert.True(result, "The method should return true to avoid user enumeration.");

        }

        [Fact]
        public async Task SendResetPasswordEmailAsync_EmailSendingFails_ReturnsFalse()
        {
            // Arrange
            MockUserSQLProvider
                .Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, _testUser.Email))
                .ReturnsAsync(_testUser);

            // Simulate email sending failure
            MockEmailResetPasswordService
                .Setup(service => service.ResetPasswordEmailSender(It.IsAny<UserModel>()))
                .ReturnsAsync(false);

            // Act
            var result = await _userAuthenticationService.SendResetPasswordEmailAsync(_testUser.Email);

            // Assert
            Assert.False(result, "The method should return false if email sending fails.");

            // Check performed invocations for debugging
            foreach (var invocation in LoggerMock.Invocations)
            {
                Console.WriteLine(invocation);
            }

            // Verify the logger was called with the expected error
            LoggerMockAuth.Verify(
                logger => logger.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString() == $"Failed to send password reset email to: {_testUser.Email}"),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true)),
                Times.Once);

        }

        [Fact]
        public async Task SendResetPasswordEmailAsync_EmailSendingSucceeds_LogsMessageAndReturnsTrue()
        {
            // Arrange
            MockUserSQLProvider
                .Setup(x => x.UserSqlExecutor.GetUserModelAsync(null, _testUser.Email))
                .ReturnsAsync(_testUser);

            MockEmailResetPasswordService
                .Setup(service => service.ResetPasswordEmailSender(It.IsAny<UserModel>()))
                .ReturnsAsync(true);

            // Act
            var result = await _userAuthenticationService.SendResetPasswordEmailAsync(_testUser.Email);

            // Assert
            Assert.True(result, "The method should return true if email sending succeeds.");

            // Verify the logger was called with the expected message
            LoggerMockAuth.Verify(
                logger => logger.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains($"Password reset email sent to: {_testUser.Email}")),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true)),
                Times.Once);
        }
        [Fact]
        public async Task CheckAuthStatusAsync_NullUser_ReturnsNotAuthenticated()
        {
            // Arrange
            ClaimsPrincipal user = null;

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_UserNotAuthenticated_ReturnsNotAuthenticated()
        {
            // Arrange: Create a user with an unauthenticated identity.
            var identity = new ClaimsIdentity(); // No authentication type specified.
            var user = new ClaimsPrincipal(identity);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_MissingJti_ReturnsNotAuthenticated()
        {
            // Arrange: Create a user missing the JTI claim.
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Email, "test@example.com"),
            new Claim("role", "User")
        };
            var identity = new ClaimsIdentity(claims, "Test");
            var user = new ClaimsPrincipal(identity);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_MissingEmail_ReturnsNotAuthenticated()
        {
            // Arrange: Create a user missing the email claim.
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("role", "User")
        };
            var identity = new ClaimsIdentity(claims, "Test");
            var user = new ClaimsPrincipal(identity);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            // If email is missing, the service logs a warning and returns Authenticated = false.
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_TokenBlacklisted_ReturnsNotAuthenticated()
        {
            // Arrange: Create a user with a valid email and JTI.
            string jti = Guid.NewGuid().ToString();
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Email, "test@example.com"),
            new Claim("role", "User")
        };
            var identity = new ClaimsIdentity(claims, "Test");
            var user = new ClaimsPrincipal(identity);

            // Set up the blacklist service to return true.
            MockTokenBlacklistService.Setup(x => x.IsTokenBlacklistedAsync(jti))
                .ReturnsAsync(true);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_AccessTokenDoesNotExist_ReturnsNotAuthenticated()
        {
            // Arrange: Create a user with valid claims.
            string jti = Guid.NewGuid().ToString();
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Email, "test@example.com"),
            new Claim("role", "User")
        };
            var identity = new ClaimsIdentity(claims, "Test");
            var user = new ClaimsPrincipal(identity);

            // Configure the blacklist service:
            // Return false for token blacklisted check.
            MockTokenBlacklistService.Setup(x => x.IsTokenBlacklistedAsync(jti))
                .ReturnsAsync(false);
            // Simulate that the active token check returns false (i.e. token does not exist).
            MockTokenBlacklistService.Setup(x => x.DoesAccessTokenJtiExistAsync(jti))
                .ReturnsAsync(false);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.False(result.Authenticated);
        }

        [Fact]
        public async Task CheckAuthStatusAsync_ValidToken_ReturnsAuthenticatedStatus()
        {
            // Arrange: Create a user with valid claims.
            string jti = Guid.NewGuid().ToString();
            string email = "test@example.com";
            string role = "User";
            var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("role", role)
        };
            var identity = new ClaimsIdentity(claims, "Test");
            var user = new ClaimsPrincipal(identity);

            // Configure the blacklist service to indicate the token is not revoked.
            MockTokenBlacklistService.Setup(x => x.IsTokenBlacklistedAsync(jti))
                .ReturnsAsync(false);
            // And simulate that the token exists in the active token table.
            MockTokenBlacklistService.Setup(x => x.DoesAccessTokenJtiExistAsync(jti))
                .ReturnsAsync(true);

            // Act
            var result = await _userAuthenticationService.CheckAuthStatusAsync(user);

            // Assert
            Assert.True(result.Authenticated);
            Assert.Equal(email, result.Email);
            Assert.Equal(role, result.Role);
        }
    }
}