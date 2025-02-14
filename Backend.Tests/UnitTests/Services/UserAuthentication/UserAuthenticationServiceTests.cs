﻿using Backend.Application.Interfaces.EmailServices;
using Backend.Application.Services.UserServices;
using Backend.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

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
    }
}