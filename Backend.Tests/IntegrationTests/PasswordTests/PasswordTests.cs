using Backend.Domain.Entities;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Backend.Tests.IntegrationTests.PasswordTests
{
    public class PasswordTests : IntegrationTestBase
    {
        [Fact]
        public async Task UpdatePasswordAsync_ShouldNotAllowReusingOldPassword()
        {
            // Arrange
            var user = await SetupUserAsync();
            var token = Guid.NewGuid();
            var password = "Password123!";

            // Save the old password as the current password in the database
            await UserSQLProvider.AuthenticationSqlExecutor.UpdatePasswordAsync(
                user.PersoId, BCrypt.Net.BCrypt.HashPassword(password)
            );

            // Generate and save a valid token for password reset
            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(user.PersoId, token);

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(token, password); // Reuse the current password

            // Assert
            Assert.False(result, "The system should not allow reusing the old password.");
        }


        [Fact]
        public async Task UpdatePasswordAsync_ShouldUpdatePasswordSuccessfully()
        {
            // Arrange
            var user = await SetupUserAsync();
            var oldPassword = "OldPassword123!";
            var newPassword = "NewPassword123!";
            var token = Guid.NewGuid();

            // Save the old password as the current password
            await UserSQLProvider.AuthenticationSqlExecutor.UpdatePasswordAsync(
                user.PersoId, BCrypt.Net.BCrypt.HashPassword(oldPassword)
            );

            // Generate and save a valid reset token
            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(user.PersoId, token);

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(token, newPassword);

            // Assert
            Assert.True(result, "The password should be successfully updated.");
        }
        [Fact]
        public async Task UpdatePasswordAsync_ShouldFailWithInvalidToken()
        {
            // Arrange
            var user = await SetupUserAsync();
            var newPassword = "NewPassword123!";
            var invalidToken = Guid.NewGuid(); // Generate a token not associated with any user

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(invalidToken, newPassword);

            // Assert
            Assert.False(result, "Password update should fail with an invalid token.");
        }


    }

}
