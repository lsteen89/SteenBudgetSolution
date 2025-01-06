using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Interfaces.UserServices;
using Backend.Application.Services.UserServices;
using Backend.Domain.Entities;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Backend.Infrastructure.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Backend.Tests.UnitTests.Password
{
    public class PasswordTests : UnitTestBase
    {
        [Fact]
        public async Task UpdatePasswordAsync_ShouldFailWhenPasswordUpdateFails()
        {
            // Arrange
            SetupUserAuthenticationServiceWithMocks(); // Initialize the service with mocks

            var user = new UserModel
            {
                PersoId = Guid.NewGuid(),
                Email = "test@example.com",
                Password = BCrypt.Net.BCrypt.HashPassword("OldPassword123!")
            };

            var token = Guid.NewGuid();
            var newPassword = "NewPassword123!";

            // Configure mocks to simulate a valid token
            MockUserTokenService
                .Setup(service => service.ValidateResetTokenAsync(token))
                .ReturnsAsync(true); // Simulate valid token

            // Configure mocks to return the user
            MockUserSQLProvider
                .Setup(provider => provider.TokenSqlExecutor.GetUserFromResetTokenAsync(token))
                .ReturnsAsync(user);

            // Simulate a database failure during password update
            MockUserSQLProvider
                .Setup(provider => provider.AuthenticationSqlExecutor.UpdatePasswordAsync(user.PersoId, It.IsAny<string>()))
                .ReturnsAsync(false); // Simulate failure

            // Act
            var result = await _userAuthenticationService.UpdatePasswordAsync(token, newPassword);

            // Assert
            Assert.False(result.Success, "Password update should fail when the update operation fails.");
            Assert.Equal(Messages.PasswordReset.UpdateFailed, result.Message);
            Assert.Equal(500, result.StatusCode);
        }


    }
}
