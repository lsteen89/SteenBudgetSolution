using Backend.DTO;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Backend.Tests.IntegrationTests.RegistrationTests
{
    public class UserSetupTest : UserServicesTestBase
    {
        [Fact]
        public async Task SetupUser_ShouldReturnUserModelAsync()
        {
            Logger.LogInformation("Starting SetupUser_ShouldReturnUserModelAsync");

            var registeredUser = await SetupUserAsync();

            Assert.NotNull(registeredUser);
            Assert.Equal(_userCreationDto.Email, registeredUser.Email);
            Assert.Equal(_userCreationDto.FirstName, registeredUser.FirstName);
            Assert.Equal(_userCreationDto.LastName, registeredUser.LastName);

            Logger.LogInformation("Finished SetupUser_ShouldReturnUserModelAsync");
        }
        [Fact]
        public async Task RegisterUserService_ShouldSucceed()
        {
            Logger.LogInformation("Starting RegisterUserService_ShouldSucceed");

            var userCreationDto = new UserCreationDto
            {
                FirstName = "Test",
                LastName = "User",
                Email = "test@example.com",
                Password = "Password123!",
                CaptchaToken = "mock-captcha-token"
            };

            var result = await UserServices.RegisterUserAsync(userCreationDto);
            Assert.True(result);

            Logger.LogInformation("Finished RegisterUserService_ShouldSucceed");
        }
    }
}
