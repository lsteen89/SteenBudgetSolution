using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;
using Moq;
using Xunit;
using Microsoft.Extensions.Logging;
using System;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;

namespace Backend.Tests.UnitTests.Services.WizardService
{
    public class WizardServiceTests
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly WizardServiceClass _wizardService;

        public WizardServiceTests()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();

            // Setup the WizardSqlExecutor property in the provider
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor).Returns(_wizardSqlExecutorMock.Object);

            // Instantiate your service with the mocked provider and a dummy logger
            var logger = Mock.Of<ILogger<WizardServiceClass>>();
            _wizardService = new WizardServiceClass(_wizardProviderMock.Object, logger);
        }

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsSuccess_WhenSqlExecutorReturnsValidGuid()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid validGuid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.CreateWizardAsync(testEmail))
                .ReturnsAsync(validGuid);

            // Act
            var result = await _wizardService.CreateWizardSessionAsync(testEmail);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal(validGuid, result.WizardSessionId);
            Assert.Equal("Wizard session created successfully.", result.Message);
        }

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsFailure_WhenSqlExecutorReturnsEmptyGuid()
        {
            // Arrange
            string testEmail = "test@example.com";
            _wizardSqlExecutorMock
                .Setup(x => x.CreateWizardAsync(testEmail))
                .ReturnsAsync(Guid.Empty);

            // Act
            var result = await _wizardService.CreateWizardSessionAsync(testEmail);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Equal(Guid.Empty, result.WizardSessionId);
            Assert.Equal("Failed to create wizard session.", result.Message);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsGuid_WhenSessionExists()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid sessionGuid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardSessionIdAsync(testEmail))
                .ReturnsAsync(sessionGuid);

            // Act
            var result = await _wizardService.UserHasWizardSessionAsync(testEmail);

            // Assert
            Assert.Equal(sessionGuid, result);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsEmptyGuid_WhenNoSessionExists()
        {
            // Arrange
            string testEmail = "test@example.com";
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardSessionIdAsync(testEmail))
                .ReturnsAsync((Guid?)null);

            // Act
            var result = await _wizardService.UserHasWizardSessionAsync(testEmail);

            // Assert
            Assert.Equal(Guid.Empty, result);
        }
    }
}
