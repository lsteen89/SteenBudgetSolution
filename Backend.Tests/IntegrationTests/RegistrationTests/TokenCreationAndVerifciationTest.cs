using Backend.Models;
using System.Threading.Tasks;
using System;
using Xunit;

namespace Backend.Tests.IntegrationTests.RegistrationTests
{
    public class TokenCreationAndVerificationTests : UserServicesTestBase
    {

        public TokenCreationAndVerificationTests()
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
            Assert.True(verificationResult);
            var verifiedUser = await UserServices.GetUserModelAsync(email: registeredUser.Email);
            Assert.True(verifiedUser.EmailConfirmed); // Confirm email was verified
            Assert.Equal(registeredUser.Email, verifiedUser.Email); // Verify using helper's data
        }

        // Test for verifying user email token with invalid token
        [Fact]
        public async Task VerifyUserToken_ShouldNotVerifyWithInvalidTokenAsync()
        {
            // Arrange - Setup user
            var registeredUser = await SetupUserAsync();

            // Act - Generate and verify token
            var tokenModel = await GenerateAndInsertTokenAsync(registeredUser.PersoId);
            var verificationResult = await UserServices.VerifyEmailTokenAsync("invalid-token");

            // Assert
            Assert.False(verificationResult);
            var verifiedUser = await UserServices.GetUserModelAsync(email: registeredUser.Email);
            Assert.False(verifiedUser.EmailConfirmed); // Confirm email was not verified
        }

        // Test for verifying user email token with expired token
        [Fact]
        public async Task VerifyUserToken_ShouldNotVerifyWithExpiredTokenAsync()
        {
            // Arrange - Setup user
            var registeredUser = await SetupUserAsync();

            // Act - Generate and verify token
            var tokenModel = await GenerateAndInsertTokenAsync(registeredUser.PersoId);
            tokenModel.TokenExpiryDate = DateTime.UtcNow.AddMinutes(-1); // Set expiry date to past
            await UserServices.UpdateUserTokenAsync(tokenModel); // Update the expiry in DB
            var verificationResult = await UserServices.VerifyEmailTokenAsync(tokenModel.Token);

            // Assert
            Assert.False(verificationResult);
            var verifiedUser = await UserServices.GetUserModelAsync(email: registeredUser.Email);
            Assert.False(verifiedUser.EmailConfirmed); // Confirm email was not verified
        }
    }
}
