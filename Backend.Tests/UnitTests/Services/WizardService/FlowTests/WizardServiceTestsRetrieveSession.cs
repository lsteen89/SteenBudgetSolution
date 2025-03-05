using Backend.Application.DTO.Wizard.Steps;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;


namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsRetrieveSession
    {
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<ILogger<WizardServiceClass>> _loggerMock;
        private readonly WizardServiceClass _wizardService;

        public WizardServiceTestsRetrieveSession()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();

            // Setup the WizardSqlExecutor property on the provider
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor)
                               .Returns(_wizardSqlExecutorMock.Object);

            // Create a mock validator for StepBudgetInfoDto that always returns valid.
            var validatorMock = new Mock<IValidator<StepBudgetInfoDto>>();
            validatorMock.Setup(x => x.Validate(It.IsAny<StepBudgetInfoDto>()))
                         .Returns(new ValidationResult()); // Always valid

            // Create a dummy logger for WizardService
            _loggerMock = new Mock<ILogger<WizardServiceClass>>();

            // Instantiate your service with the mocked provider, the mock validator, and the logger.
            _wizardService = new WizardServiceClass(_wizardProviderMock.Object, validatorMock.Object, _loggerMock.Object);
        }

        [Fact]
        public async Task GetWizardDataAsync_ValidData_ReturnsJsonString()
        {
            // Arrange
            string validJson = "{ \"key\": \"value\" }";

            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardDataAsync(It.IsAny<string>()))
                .ReturnsAsync(validJson);

            // Act
            var result = await _wizardService.GetWizardDataAsync("test-session-id");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(validJson, result);
        }


        [Fact]
        public async Task GetWizardDataAsync_NoDataFound_ReturnsNull()
        {
            // Arrange
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardDataAsync(It.IsAny<string>()))
                .ReturnsAsync((string?)null);

            // Act
            var result = await _wizardService.GetWizardDataAsync("test-session-id");

            // Assert
            Assert.Null(result);

            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Warning,               // Ensure the log level is "Warning"
                    It.IsAny<EventId>(),            // Ignore EventId
                    It.Is<It.IsAnyType>((o, t) =>   // Ensure the log message contains expected text
                        o.ToString()!.Contains("No wizard data found for session")),
                    It.IsAny<Exception>(),          // No exception expected
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>() // Ignore formatting function
                ), Times.Once);
        }
    }
}
