using Backend.Application.DTO.Wizard.Steps;
using Backend.Application.Services.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsRetrieveSessionDictionary
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly Mock<ILogger<WizardServiceClass>> _loggerMock;
        private readonly WizardServiceClass _wizardService;

        public WizardServiceTestsRetrieveSessionDictionary()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();
            _loggerMock = new Mock<ILogger<WizardServiceClass>>();

            // Setup the WizardSqlExecutor property on the provider
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor)
                               .Returns(_wizardSqlExecutorMock.Object);

            // Create a mock validator for StepBudgetInfoDto that always returns valid.
            var validatorMock = new Mock<IValidator<StepBudgetInfoDto>>();
            validatorMock.Setup(x => x.Validate(It.IsAny<StepBudgetInfoDto>()))
                         .Returns(new ValidationResult()); // Always valid

            // Instantiate your service with the mocked provider, validator, and logger.
            _wizardService = new WizardServiceClass(_wizardProviderMock.Object, validatorMock.Object, _loggerMock.Object);
        }

        [Fact]
        public async Task GetWizardDataAsync_OneRow_ReturnsDictionary()
        {
            // Arrange: simulate a single row from the database.
            var dictionary = new Dictionary<int, object>
            {
                // Parse the JSON string into a JObject.
                [1] = JObject.Parse("{\"netSalary\":1233.0,\"salaryFrequency\":\"monthly\",\"yearlySalary\":14796.0,\"householdMembers\":[],\"sideHustles\":[]}")
            };

            // Set up the repository call to return the dictionary.
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardStepDataAsync(It.IsAny<string>()))
                .ReturnsAsync(dictionary);

            // Act: call the service method.
            var result = await _wizardService.GetWizardDataAsync("test-session-id");

            // Assert: result should not be null, should contain one key, etc.
            Assert.NotNull(result);
            Assert.Single(result!);
            Assert.True(result.ContainsKey(1));

            // The value should be a JObject with the expected properties.
            var jObject = result[1] as JObject;
            Assert.NotNull(jObject);
            Assert.Equal(1233.0m, jObject!["netSalary"]?.Value<decimal>());
            Assert.Equal("monthly", jObject["salaryFrequency"]?.Value<string>());
        }

        [Fact]
        public async Task GetWizardDataAsync_NoRows_ReturnsNull()
        {
            // Arrange: simulate an empty dictionary (no rows)
            Dictionary<int, object>? emptyDictionary = null;
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardStepDataAsync(It.IsAny<string>()))
                .ReturnsAsync(emptyDictionary);

            // Act
            var result = await _wizardService.GetWizardDataAsync("test-session-id");

            // Assert: result should be null.
            Assert.Null(result);
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("No wizard data found for session")),
                    null,
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ), Times.Once);
        }

        [Fact]
        public async Task GetWizardDataAsync_TwoRowsDifferentSteps_ReturnsDictionaryForBoth()
        {
            // Arrange: simulate two rows for different steps in a dictionary.
            var dictionary = new Dictionary<int, object>
            {
                [1] = JObject.Parse("{\"netSalary\":1000,\"salaryFrequency\":\"monthly\",\"yearlySalary\":12000,\"householdMembers\":[],\"sideHustles\":[]}"),
                [2] = JObject.Parse("{\"someOtherKey\":\"someValue\"}")
            };

            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardStepDataAsync(It.IsAny<string>()))
                .ReturnsAsync(dictionary);

            // Act
            var result = await _wizardService.GetWizardDataAsync("test-session-id");

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result!.Count);
            Assert.True(result.ContainsKey(1));
            Assert.True(result.ContainsKey(2));
        }
    }

    // A helper class representing a row from the WizardStep table.
    internal class WizardStepRow
    {
        public int StepNumber { get; set; }
        public string StepData { get; set; } = string.Empty;
    }
}
