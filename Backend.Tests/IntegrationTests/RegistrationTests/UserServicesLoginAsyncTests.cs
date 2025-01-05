using Backend.Application.DTO;
using Backend.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using Xunit;
using Microsoft.AspNetCore.Http;
using System.Net;
using Moq;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Services.UserServices;
using Microsoft.Extensions.DependencyInjection;
using Backend.Infrastructure.Interfaces;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using Backend.Domain.Entities;

namespace Backend.Tests.IntegrationTests.RegistrationTests
{
    public class UserServicesTests : IntegrationTestBase
    {
        private Dictionary<string, (string Value, CookieOptions Options)> cookieContainer;
        public UserServicesTests()
        {
            cookieContainer = new Dictionary<string, (string Value, CookieOptions Options)>(); 
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_IntegrationTest()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            string ipAddress = "";
            // Insert a user into the database using SetupUserAsync
            var registeredUser = await SetupUserAsync();

            // Verify email in database
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(result.Success);
            Assert.Equal("Login successful.", result.Message);

            // Assert that the returned user email matches the input email
            Assert.Equal(userLoginDto.Email, result.UserName);

            // Assert that a valid auth token is set in cookies
            Assert.True(CookieContainer.ContainsKey("auth_token"));
            var authCookie = CookieContainer["auth_token"];
            //Assert.NotNull(authCookie.Value); // Check that the token exists
            Assert.DoesNotContain("Bearer", authCookie.Value); // Validate token format
            Assert.NotEmpty(authCookie.Value); // Ensure token is present
        }

        [Fact]
        public async Task LoginAsync_ValidCredentials_TokenHasExpectedClaims()
        {
            // Mock production environment
            MockEnvironmentService
                .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
                .Returns("Production");
            // Arrange
            string ipAddress = "";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(result.Success);

            var authCookie = CookieContainer["auth_token"];
            Assert.NotNull(authCookie.Value); // Ensure token exists
            Assert.DoesNotContain("Bearer", authCookie.Value); // Validate token format

            // Decode and validate JWT token (use a JWT library)
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(authCookie.Value);

            Assert.Equal("eBudget", token.Issuer);
            Assert.Equal("eBudget", token.Audiences.First());
            Assert.Equal(registeredUser.Email, token.Claims.First(c => c.Type == "email").Value);

            // Assert cookie options
            var options = authCookie.Options;
            Assert.True(options.HttpOnly);
            Assert.True(options.Secure);
            Assert.Equal(SameSiteMode.Strict, options.SameSite);
        }
        [Fact]
        public async Task LoginAsync_TokenExpires_ShouldDenyAccess()
        {
            // Arrange
            string ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            Assert.NotNull(registeredUser);
            Assert.NotNull(registeredUser.PersoId);
            Assert.NotNull(registeredUser.Email);

            // Simulate token creation time
            var tokenCreationTime = DateTime.UtcNow;
            MockTimeProvider.Setup(tp => tp.UtcNow).Returns(tokenCreationTime);

            // Act: Perform the login
            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);
            Assert.True(result.Success, "Login should succeed.");

            Assert.True(CookieContainer.ContainsKey("auth_token"), "Auth token should exist in the cookie container.");
            var authCookie = CookieContainer["auth_token"];
            Assert.NotNull(authCookie.Value); // Ensure token exists

            // Simulate time passing to trigger token expiration
            MockTimeProvider.Setup(tp => tp.UtcNow).Returns(tokenCreationTime.AddMinutes(16)); // Simulate 16 minutes passing

            // Attempt a protected operation
            var isAuthorized = await UserTokenService.IsAuthorizedAsync(authCookie.Value);

            // Assert
            Assert.False(isAuthorized, "Token should not be authorized after expiration.");
        }
        [Fact]
        public async Task LoginAsync_ConcurrentLogins_ShouldWork()
        {
            // Arrange
            string ipAddress = "";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act - Perform multiple login attempts
            var result1 = await UserServices.LoginAsync(userLoginDto, ipAddress);
            var result2 = await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(result1.Success);
            Assert.True(result2.Success);
            Assert.NotEqual(result1.Token, result2.Token); // Tokens should be unique
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_ShouldSetSecureHeaders()
        {
            // Mock production environment
            MockEnvironmentService
                .Setup(e => e.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"))
                .Returns("Production");

            // Validate the mock before running the test
            var mockValue = MockEnvironmentService.Object.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
            Assert.Equal("Production", mockValue);
            var authService = ServiceProvider.GetRequiredService<IUserAuthenticationService>();


            // Arrange
            string ipAddress = "";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(CookieContainer.ContainsKey("auth_token"));
            var authCookie = CookieContainer["auth_token"];

            // Access CookieOptions for assertions
            var options = authCookie.Options;
            Assert.True(options.HttpOnly, "HttpOnly should be true");
            Assert.True(options.Secure, "Secure should be True");
            Assert.Equal(SameSiteMode.Strict, options.SameSite);
        }


        [Fact]
        public async Task LoginAsync_TamperedToken_ShouldDenyAccess()
        {
            // Arrange
            string ipAddress = "";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);
            Assert.True(result.Success);

            var authCookie = CookieContainer["auth_token"];
            Assert.NotNull(authCookie);

            // Tamper with the token
            var tamperedToken = authCookie.Value.Substring(0, authCookie.Value.Length - 1) + "X";

            // Act - Attempt to use the tampered token
            var isAuthorized = await UserTokenService.IsAuthorizedAsync(tamperedToken); 

            // Assert
            Assert.False(isAuthorized);
        }
        [Fact]
        public async Task CookieContainer_ShouldCaptureAuthToken()
        {
            // Arrange
            string ipAddress = "";
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(CookieContainer.ContainsKey("auth_token"), "auth_token should exist in cookies");
            var authCookie = CookieContainer["auth_token"];
            Assert.NotNull(authCookie.Value);
            Assert.True(authCookie.Options.HttpOnly);
        }
        [Fact]
        public void HttpContext_ShouldBeInitialized()
        {
            ValidateHttpContext();
        }
        [Fact]
        public void Cookies_ShouldAppendCorrectly()
        {
            // Arrange
            var cookieName = "test_cookie";
            var cookieValue = "test_value";
            var cookieOptions = new CookieOptions { HttpOnly = true };

            // Act
            HttpContext.Response.Cookies.Append(cookieName, cookieValue, cookieOptions);

            // Assert
            Assert.True(CookieContainer.ContainsKey(cookieName));
            Assert.Equal(cookieValue, CookieContainer[cookieName].Value);
            Assert.Equal(cookieOptions.HttpOnly, CookieContainer[cookieName].Options.HttpOnly);
        }
        [Fact]
        public async Task LoginAsync_ShouldLockUser_AfterMultipleFailedAttempts()
        {
            // Arrange
            var email = "test@example.com";
            var ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto { Email = email, Password = "WrongPassword" };

            // Ensure the user exists
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Simulate multiple failed login attempts
            for (int i = 0; i < 5; i++)
            {
                var result = await UserServices.LoginAsync(userLoginDto, ipAddress);
                Assert.False(result.Success, $"Attempt {i + 1}: Login should fail");
            }

            // Act
            var isLockedOut = await UserAuthenticationService.CheckLoginAttemptsAsync(email);

            // Assert
            Assert.True(isLockedOut, "User should be locked out after exceeding failed attempts");
        }
        [Fact]
        public async Task LoginAsync_ShouldUnlockUser_AfterLockoutPeriod()
        {
            // Arrange
            var email = "test@example.com";
            var ipAddress = "127.0.0.1";
            var userLoginDto = new UserLoginDto { Email = email, Password = "Password123!" };

            // Ensure the user exists and gets locked out
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);
            await UserAuthenticationService.LockUserAsync(email, TimeSpan.FromMinutes(1)); // Lock for 1 minute

            // Act 1: Verify the user is locked out
            var isLockedOutBefore = await UserAuthenticationService.CheckLoginAttemptsAsync(email);
            Assert.True(isLockedOutBefore, "User should initially be locked out");

            // Wait for lockout period to expire
            await Task.Delay(TimeSpan.FromMinutes(2));

            // Act 2: Attempt login after lockout period
            var result = await UserServices.LoginAsync(userLoginDto, ipAddress);

            // Assert
            Assert.True(result.Success, "User should be able to log in after the lockout period expires");
        }
        [Fact]
        public async Task LoginAsync_SuccessfulLogin_ShouldResetFailedAttemptsCounter()
        {
            // Arrange
            var email = "test@example.com";
            var ipAddress = "127.0.0.1";
            var wrongLoginDto = new UserLoginDto { Email = email, Password = "Password1234!" };
            var correctLoginDto = new UserLoginDto { Email = email, Password = "Password123!" };

            // Ensure the user exists
            var registeredUser = await SetupUserAsync();

            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Simulate a failed login attempt
            await UserServices.LoginAsync(wrongLoginDto, ipAddress);

            // Verify failed attempts count
            var failedAttempts = await UserSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(registeredUser.PersoId);
            Assert.Equal(1, failedAttempts);

            // Act: Successful login
            var result = await UserServices.LoginAsync(correctLoginDto, ipAddress);

            // Assert
            Assert.True(result.Success, "User should successfully log in with correct credentials");

            // Verify failed attempts counter is reset
            failedAttempts = await UserSQLProvider.AuthenticationSqlExecutor.GetRecentFailedAttemptsAsync(registeredUser.PersoId);
            Assert.Equal(0, failedAttempts);
        }
    }
}
