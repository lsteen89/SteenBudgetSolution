using Backend.Domain.Entities.Auth;
using Backend.Domain.Shared;
using Backend.Tests.Fixtures;
using Xunit;

namespace Backend.Tests.IntegrationTests.RegistrationTests
{
    public class TokenCreationAndVerificationTests : IntegrationTestBase
    {
        public TokenCreationAndVerificationTests(DatabaseFixture fixture)
    : base(fixture)
        {
        }

        // Test for verifying user email token
        [Fact]
        public async Task VerifyUserToken_ShouldSetEmailConfirmedToTrueAsync()
        {
            // Arrange - Setup user
            var registeredUser = await SetupUserAsync();

            // Act - Generate and verify token
            var tokenModel = await GenerateAndInsertTokenAsync(registeredUser.PersoId);
            var verificationResult = await UserServices.VerifyEmailTokenAsync(tokenModel.Token);

            // Assert
            Assert.True(verificationResult.Success); // Ensure operation was successful
            Assert.Equal(Messages.EmailVerification.VerificationSuccessful, verificationResult.Message);

            var verifiedUser = await UserSQLProvider.UserSqlExecutor.GetUserModelAsync(email: registeredUser.Email);
            Assert.True(verifiedUser.EmailConfirmed); // Confirm email was verified
            Assert.Equal(registeredUser.Email, verifiedUser.Email); // Verify using helper's data
        }


        // Test for verifying user email token with invalid token
        [Fact]
        public async Task VerifyUserToken_ShouldNotVerifyWithInvalidTokenAsync()
        {
            // Arrange - Setup user
            var registeredUser = await SetupUserAsync();

            // Act - Generate token but use an invalid one for verification
            var tokenModel = await GenerateAndInsertTokenAsync(registeredUser.PersoId);
            Guid invalidGuid = Guid.NewGuid(); // Generate invalid token
            var verificationResult = await UserServices.VerifyEmailTokenAsync(invalidGuid);

            // Assert
            Assert.False(verificationResult.Success); // Ensure operation failed
            Assert.Equal(Messages.EmailVerification.VerificationFailed, verificationResult.Message);

            var verifiedUser = await UserSQLProvider.UserSqlExecutor.GetUserModelAsync(email: registeredUser.Email);
            Assert.False(verifiedUser.EmailConfirmed); // Confirm email was not verified
        }


        // Test for verifying user email token with expired token
        [Fact]
        public async Task VerifyUserToken_ShouldNotVerifyWithExpiredTokenAsync()
        {
            // Arrange - Setup user
            var registeredUser = await SetupUserAsync();

            // Act - Generate token, then expire it
            var tokenModel = await GenerateAndInsertTokenAsync(registeredUser.PersoId);
            tokenModel.TokenExpiryDate = DateTime.UtcNow.AddMinutes(-1); // Set expiry date to the past
            await UserServiceTest.ModifyTokenExpiryAndRetrieveAsync(tokenModel); // Update expiry in DB
            var verificationResult = await UserServices.VerifyEmailTokenAsync(tokenModel.Token);

            // Assert
            Assert.False(verificationResult.Success); // Ensure operation failed
            Assert.Equal(Messages.EmailVerification.VerificationFailed, verificationResult.Message);

            var verifiedUser = await UserSQLProvider.UserSqlExecutor.GetUserModelAsync(email: registeredUser.Email);
            Assert.False(verifiedUser.EmailConfirmed); // Confirm email was not verified
        }

        [Fact]
        public async Task SaveResetTokenAsync_ShouldReplaceOldTokenWithNewToken()
        {
            // Arrange - Setup user, generate and insert token
            var registeredUser = await SetupUserAsync();
            // Arrange

            var oldToken = Guid.NewGuid();
            await UserTokenService.SaveResetTokenAsync(registeredUser.PersoId, oldToken);

            // Act
            var newToken = Guid.NewGuid();
            await UserTokenService.SaveResetTokenAsync(registeredUser.PersoId, newToken);

            // Assert
            var tokens = await UserSQLProvider.TokenSqlExecutor.GetResetTokensByPersoIdAsync(registeredUser.PersoId);
            Assert.Single(tokens); // Ensure only one token exists
            Assert.Equal(newToken, tokens.First().Token); // Verify it's the new token
        }

        [Fact]
        public async Task DeletingUser_ShouldCascadeDeleteTokens()
        {
            // Arrange
            var registeredUser = await SetupUserAsync();
            var token1 = Guid.NewGuid();
            var token2 = Guid.NewGuid();
            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(registeredUser.PersoId, token1);
            await UserSQLProvider.TokenSqlExecutor.SaveResetTokenAsync(registeredUser.PersoId, token2);

            // Act
            await UserSQLProvider.UserSqlExecutor.DeleteUserByEmailAsync(registeredUser.Email);

            // Assert
            var tokens = await UserSQLProvider.TokenSqlExecutor.GetResetTokensByPersoIdAsync(registeredUser.PersoId);
            Assert.Empty(tokens); // Ensure all tokens are deleted
        }
        private async Task<UserTokenModel> GenerateAndInsertTokenAsync(Guid persoId)
        {
            var tokenModel = await UserTokenService.CreateEmailTokenAsync(persoId);
            var tokenInserted = await UserTokenService.InsertUserTokenAsync(tokenModel);
            return tokenModel;
        }
    }
}
