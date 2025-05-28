using Backend.Domain.Shared;
using Backend.Tests.Fixtures;
using Xunit;

namespace Backend.Tests.IntegrationTests.PasswordTests
{
    public class PasswordTests : IntegrationTestBase
    {
        public PasswordTests(DatabaseFixture fixture)
    : base(fixture)
        {
        }
        [Fact]
        public async Task UpdatePasswordAsync_ShouldNotAllowReusingOldPassword()
        {
            // Arrange
            var user = await SetupUserAsync();
            var token = Guid.NewGuid();
            var password = "Password123!";

            await UserSQLProvider.AuthenticationSqlExecutor.UpdatePasswordAsync(
                user.PersoId, BCrypt.Net.BCrypt.HashPassword(password)
            );

            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(user.PersoId, token);

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(token, password);

            // Assert
            Assert.False(result.Success, "The system should not allow reusing the old password.");
            Assert.Equal(Messages.PasswordReset.SamePassword, result.Message);
            Assert.Equal(400, result.StatusCode);
        }

        [Fact]
        public async Task UpdatePasswordAsync_ShouldUpdatePasswordSuccessfully()
        {
            // Arrange
            var user = await SetupUserAsync();
            var oldPassword = "OldPassword123!";
            var newPassword = "NewPassword123!";
            var token = Guid.NewGuid();

            await UserSQLProvider.AuthenticationSqlExecutor.UpdatePasswordAsync(
                user.PersoId, BCrypt.Net.BCrypt.HashPassword(oldPassword)
            );

            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(user.PersoId, token);

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(token, newPassword);

            // Assert
            Assert.True(result.Success, "The password should be successfully updated.");
            Assert.Equal(Messages.PasswordReset.PasswordUpdated, result.Message);
            Assert.Null(result.StatusCode); // Assuming StatusCode is null on success
        }

        [Fact]
        public async Task UpdatePasswordAsync_ShouldFailWithInvalidToken()
        {
            // Arrange
            var user = await SetupUserAsync();
            var newPassword = "NewPassword123!";
            var invalidToken = Guid.NewGuid();

            // Act
            var result = await UserAuthenticationService.UpdatePasswordAsync(invalidToken, newPassword);

            // Assert
            Assert.False(result.Success, "Password update should fail with an invalid token.");
            Assert.Equal(Messages.PasswordReset.InvalidToken, result.Message);
            Assert.Equal(400, result.StatusCode);
        }

    }

}
