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

            // Insert a user into the database using SetupUserAsync
            var registeredUser = await SetupUserAsync();

            // Verify email in database
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto);

            // Assert
            Assert.True(result.Success);
            Assert.Equal("Login successful", result.Message);

            // Assert that the returned user email matches the input email
            Assert.Equal(userLoginDto.Email, result.UserName);

            // Assert that a valid auth token is set in cookies
            Assert.True(CookieContainer.ContainsKey("auth_token"));
            var authCookie = CookieContainer["auth_token"];
            Assert.NotNull(authCookie.Value); // Check that the token exists
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
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto);

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
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Configure the mock token service
            MockTokenService
                .Setup(ts => ts.GenerateJwtToken(It.IsAny<string>(), It.IsAny<string>(), null))
                .Returns(() =>
                {
                    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("YourTestJwtSecretKey12345678901234567856456"));
                    var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                    var claims = new List<Claim>
                    {
                new Claim(JwtRegisteredClaimNames.Sub, registeredUser.PersoId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, registeredUser.Email),
                new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
                    };

                    var token = new JwtSecurityToken(
                        issuer: "eBudget",
                        audience: "eBudget",
                        claims: claims,
                        expires: DateTime.UtcNow.AddMinutes(1), // Short expiration time
                        signingCredentials: credentials
                    );

                    return new JwtSecurityTokenHandler().WriteToken(token);
                });

            // Act
            var result = await UserServices.LoginAsync(userLoginDto);
            Assert.True(result.Success);

            await Task.Delay(TimeSpan.FromMinutes(2)); // Wait for the token to expire

            // Attempt a protected operation
            var authCookie = CookieContainer["auth_token"];
            var isAuthorized = await UserTokenService.IsAuthorizedAsync(authCookie.Value); // Pass the token string

            // Assert
            Assert.False(isAuthorized, "Token should not be authorized after expiration");
        }

        [Fact]
        public async Task LoginAsync_ConcurrentLogins_ShouldWork()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act - Perform multiple login attempts
            var result1 = await UserServices.LoginAsync(userLoginDto);
            var result2 = await UserServices.LoginAsync(userLoginDto);

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
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            var result = await UserServices.LoginAsync(userLoginDto);

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
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            var result = await UserServices.LoginAsync(userLoginDto);
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
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "Password123!" };
            var registeredUser = await SetupUserAsync();
            await UserServiceTest.ConfirmUserEmailAsync(registeredUser.PersoId);

            // Act
            await UserServices.LoginAsync(userLoginDto);

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

    }
}
