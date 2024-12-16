using Backend.Application.Services.UserServices;
using Backend.Application.Settings;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using System.Threading.Tasks;
using Backend.Application.DTO;
using Backend.Infrastructure.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Backend.Tests.UnitTests.UserService
{
    public class UserServicesTests : UnitTestBase
    {
        public UserServicesTests() 
        { 
            Setup();
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsSuccessAndSetsCookie()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "ValidPassword123" };
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("ValidPassword123");
            var userModel = new UserModel
            {
                PersoId = Guid.NewGuid(),
                Email = userLoginDto.Email,
                Password = hashedPassword,
                EmailConfirmed = true
            };

            // Mock GetUserModelAsync to return a valid user
            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync(userModel);

            // Use a real instance of TokenService
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string>
                {
                     { "JWT_SECRET_KEY", "YourTestJwtSecretKey12345678901234567856456" }
                })
                .Build();

            var tokenService = new TokenService(configuration);

            // Generate a real JWT token for comparison
            var testToken = tokenService.GenerateJwtToken("test-user-id", "test@example.com");

            // Assert
            Assert.NotNull(testToken);

            // Mock HttpContext response to capture cookies
            var mockResponse = new Mock<HttpResponse>();
            var cookieContainer = new Dictionary<string, (string Value, CookieOptions Options)>();

            mockResponse
                .Setup(r => r.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()))
                .Callback<string, string, CookieOptions>((key, value, options) =>
                {
                    cookieContainer[key] = (value, options); // Capture the cookie value and options
                });

            MockHttpContext
                .Setup(c => c.Response)
                .Returns(mockResponse.Object);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.True(result.Success, "Expected Success to be true.");
            Assert.Equal("Login successful", result.Message);
            Assert.Equal(userModel.Email, result.UserName);

            // Validate cookie options
            var authCookie = cookieContainer["auth_token"];
            Assert.True(authCookie.Options.HttpOnly); // Ensure HttpOnly is set
            Assert.True(authCookie.Options.Secure); // Ensure Secure flag is set if in production
            Assert.Equal(SameSiteMode.Strict, authCookie.Options.SameSite); // Validate SameSite

        }

        [Fact]
        public async Task LoginAsync_InvalidCredentials_ReturnsFailure()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "InvalidPassword" };

            // Mock GetUserModelAsync to return null (user not found)
            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync((UserModel)null);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.False(result.Success, "Expected Success to be false.");
            Assert.Equal("Invalid credentials", result.Message);

            // Verify no cookie is set
            MockHttpContext.Verify(c => c.Response.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()), Times.Never);
        }
        [Fact]
        public async Task LoginAsync_UnconfirmedEmail_ReturnsFailure()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "ValidPassword123" };
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("ValidPassword123");
            var userModel = new UserModel
            {
                PersoId = Guid.NewGuid(),
                Email = userLoginDto.Email,
                Password = hashedPassword,
                EmailConfirmed = false // Email not confirmed
            };

            // Mock GetUserModelAsync to return a user with an unconfirmed email
            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync(userModel);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.False(result.Success, "Expected Success to be false.");
            Assert.Equal("Email not confirmed", result.Message);

            // Verify no cookie is set
            MockHttpContext.Verify(c => c.Response.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()), Times.Never);
        }
        [Fact]
        public async Task LoginAsync_UserNotFound_ReturnsFailure()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "nonexistent@example.com", Password = "SomePassword123" };

            // Mock GetUserModelAsync to return null
            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync((UserModel)null);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.False(result.Success, "Expected Success to be false.");
            Assert.Equal("Invalid credentials", result.Message);

            // Verify no cookie is set
            MockHttpContext.Verify(c => c.Response.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()), Times.Never);
        }
        [Fact]
        public async Task LoginAsync_InvalidPassword_ReturnsFailure()
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "WrongPassword123" };
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123");
            var userModel = new UserModel
            {
                PersoId = Guid.NewGuid(),
                Email = userLoginDto.Email,
                Password = hashedPassword,
                EmailConfirmed = true
            };

            // Mock GetUserModelAsync to return a valid user
            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync(userModel);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.False(result.Success, "Expected Success to be false.");
            Assert.Equal("Invalid credentials", result.Message);

            // Verify no cookie is set
            MockHttpContext.Verify(c => c.Response.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()), Times.Never);
        }
        [Theory]
        [InlineData(null, "ValidPassword123")]
        [InlineData("test@example.com", null)]
        [InlineData("", "ValidPassword123")]
        [InlineData("test@example.com", "")]
        public async Task LoginAsync_NullOrEmptyCredentials_ReturnsFailure(string email, string password)
        {
            // Arrange
            var userLoginDto = new UserLoginDto { Email = email, Password = password };

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            Assert.False(result.Success, "Expected Success to be false.");
            Assert.Equal("Invalid credentials", result.Message);

            // Verify no cookie is set
            MockHttpContext.Verify(c => c.Response.Cookies.Append(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CookieOptions>()), Times.Never);
        }
        [Fact]
        public async Task LoginAsync_ValidCredentials_DoesNotSetSecureCookieInDevelopment()
        {
            // Arrange
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");

            var userLoginDto = new UserLoginDto { Email = "test@example.com", Password = "ValidPassword123" };
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("ValidPassword123");
            var userModel = new UserModel
            {
                PersoId = Guid.NewGuid(),
                Email = userLoginDto.Email,
                Password = hashedPassword,
                EmailConfirmed = true
            };

            MockUserSqlExecutor
                .Setup(x => x.GetUserModelAsync(It.Is<Guid?>(id => id == null), It.IsAny<string>()))
                .ReturnsAsync(userModel);

            // Act
            var result = await UserServicesInstance.LoginAsync(userLoginDto);

            // Assert
            var authCookie = CookiesContainer["auth_token"];
            Assert.True(authCookie.Options.HttpOnly, "HttpOnly should always be true.");
            Assert.False(authCookie.Options.Secure, "Secure should not be set in Development.");
        }

    }
}
