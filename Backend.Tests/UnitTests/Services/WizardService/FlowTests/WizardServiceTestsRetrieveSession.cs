using Backend.Application.DTO.Wizard.Steps;
using Backend.Application.Services.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using Backend.Infrastructure.Entities.Wizard;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Data.Common;
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
            // Arrange: simulate a single raw entity from the database.
            var wizardSessionId = "test-session-id";
            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = 1,
                    SubStep = 1,
                    StepData = "{\"netSalary\":1233.0,\"salaryFrequency\":\"monthly\",\"yearlySalary\":14796.0,\"householdMembers\":[],\"sideHustles\":[]}",
                    UpdatedAt = DateTime.UtcNow
                }
            };

            // Set up the mock for the GetRawWizardStepDataAsync method.
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId, It.IsAny<DbConnection>(), It.IsAny<DbTransaction>()))
                               .ReturnsAsync(rawEntities);

            // Act: call the service method.
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // Assert: result should not be null, should contain one key, etc.
            Assert.NotNull(result);
            Assert.Single(result!);
            Assert.True(result.ContainsKey(1));

            // The value should be a JObject with the expected properties (after merging - although in this single-row case, no merging happens for the same step).
            var jObject = result[1] as JObject;
            Assert.NotNull(jObject);
            Assert.Equal(1233.0m, jObject!["netSalary"]?.Value<decimal>());
            Assert.Equal("monthly", jObject["salaryFrequency"]?.Value<string>());
        }

        [Fact]
        public async Task GetWizardDataAsync_NoRows_ReturnsNull()
        {
            // Arrange: simulate an empty list of raw entities from the database.
            var wizardSessionId = "test-session-id";
            List<WizardStepRowEntity>? emptyList = null; // Or new List<WizardStepRowEntity>()

            // Set up the mock for the GetRawWizardStepDataAsync method to return null or an empty list.
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId, It.IsAny<DbConnection>(), It.IsAny<DbTransaction>()))
                               .ReturnsAsync(emptyList);

            // Act
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // Assert: result should be null.
            Assert.Null(result);
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("No raw wizard data found for session")),
                    null,
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ), Times.Once);
        }

        [Fact]
        public async Task GetWizardDataAsync_TwoRowsDifferentSteps_ReturnsDictionaryForBoth()
        {
            // Arrange: simulate two raw entities for different steps from the database.
            var wizardSessionId = "test-session-id";
            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = 1,
                    SubStep = 1,
                    StepData = "{\"netSalary\":1000,\"salaryFrequency\":\"monthly\",\"yearlySalary\":12000,\"householdMembers\":[],\"sideHustles\":[]}",
                    UpdatedAt = DateTime.UtcNow
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = 2,
                    SubStep = 1,
                    StepData = "{\"someOtherKey\":\"someValue\"}",
                    UpdatedAt = DateTime.UtcNow
                }
            };

            // Set up the mock for the GetRawWizardStepDataAsync method.
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId, It.IsAny<DbConnection>(), It.IsAny<DbTransaction>()))
                               .ReturnsAsync(rawEntities);

            // Act
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(2, result!.Count);
            Assert.True(result.ContainsKey(1));
            Assert.True(result.ContainsKey(2));

            // Optionally, you can also assert the content of the JObjects in the result.
            var jObjectStep1 = result[1] as JObject;
            Assert.NotNull(jObjectStep1);
            Assert.Equal(1000m, jObjectStep1!["netSalary"]?.Value<decimal>());

            var jObjectStep2 = result[2] as JObject;
            Assert.NotNull(jObjectStep2);
            Assert.Equal("someValue", jObjectStep2!["someOtherKey"]?.Value<string>());
        }
        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepDifferentSubsteps_ReturnsMergedDictionary()
        {
            // Arrange: Simulate two raw entities for the same step but different substeps.
            var stepNumber = 2;
            var wizardSessionId = "test-session-id";
            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = stepNumber,
                    SubStep = 1,
                    StepData = "{\"rent\":{\"homeType\":\"Apartment\",\"monthlyRent\":1000}}",
                    UpdatedAt = DateTime.UtcNow
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = stepNumber,
                    SubStep = 2,
                    StepData = "{\"utilities\":{\"electricity\":50,\"water\":30}}",
                    UpdatedAt = DateTime.UtcNow
                }
            };

            // Set up the mock for the GetRawWizardStepDataAsync method.
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId, It.IsAny<DbConnection>(), It.IsAny<DbTransaction>()))
                               .ReturnsAsync(rawEntities);

            // Act
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result); // Expecting one entry for step 2 after merging
            Assert.True(result.ContainsKey(stepNumber));

            var stepData = result[stepNumber] as JObject;
            Assert.NotNull(stepData);

            // Assert that data from both substeps is present and not overwritten
            Assert.NotNull(stepData["rent"]);
            Assert.Equal("Apartment", stepData["rent"]!["homeType"]?.ToString());
            Assert.Equal(1000, stepData["rent"]!["monthlyRent"]?.ToObject<int>());

            Assert.NotNull(stepData["utilities"]);
            Assert.Equal(50, stepData["utilities"]!["electricity"]?.ToObject<int>());
            Assert.Equal(30, stepData["utilities"]!["water"]?.ToObject<int>());

            // Ensure the subStep keys are not present in the final merged object
            Assert.Null(stepData["subStep"]);
        }
        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepSameSubstep_LastRowOverwrites()
        {
            // Arrange: Simulate two raw entities for the same step and the same substep.
            var stepNumber = 2;
            var wizardSessionId = "test-session-id";
            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = stepNumber,
                    SubStep = 1,
                    StepData = "{\"rent\":{\"monthlyRent\":1000}}",
                    UpdatedAt = DateTime.UtcNow
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber = stepNumber,
                    SubStep = 1,
                    StepData = "{\"utilities\":{\"electricity\":50}}",
                    UpdatedAt = DateTime.UtcNow
                }
            };

            // Set up the mock for the GetRawWizardStepDataAsync method.
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId, It.IsAny<DbConnection>(), It.IsAny<DbTransaction>()))
                               .ReturnsAsync(rawEntities);

            // Act
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // Assert
            Assert.NotNull(result);
            Assert.Single(result);
            Assert.True(result.ContainsKey(stepNumber));

            var stepData = result[stepNumber] as JObject;
            Assert.NotNull(stepData);

            // Assert that the data from the last row overwrites the first for the same substep
            Assert.Null(stepData["rent"]); // Should be overwritten
            Assert.NotNull(stepData["utilities"]);
            Assert.Equal(50, stepData["utilities"]!["electricity"]?.ToObject<int>());
            Assert.Null(stepData["subStep"]);
        }
    }

    // A helper class representing a row from the WizardStep table.
    internal class WizardStepRow
    {
        public int StepNumber { get; set; }
        public string StepData { get; set; } = string.Empty;
    }
}
