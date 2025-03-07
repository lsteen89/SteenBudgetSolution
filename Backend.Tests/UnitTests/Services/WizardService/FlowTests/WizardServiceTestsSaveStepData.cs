using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Backend.Application.DTO.Wizard.Steps; // Adjust namespaces as needed
using Backend.Application.Services.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using FluentValidation;
using FluentValidation.Results;
using Moq;
using Newtonsoft.Json;
using Xunit;
using Microsoft.Extensions.Logging;
using Backend.Application.Validators.WizardValidation;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsSaveStepData
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly WizardServiceClass _wizardService;
        private readonly IValidator<StepBudgetInfoDto> _validator;

        public WizardServiceTestsSaveStepData()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();

            // Setup the WizardSqlExecutor property on the provider
            _wizardProviderMock.Setup(x => x.WizardSqlExecutor)
                               .Returns(_wizardSqlExecutorMock.Object);

            // Use a real validator instance
            _validator = new StepBudgetInfoValidator();

            // Create a dummy logger
            var logger = Mock.Of<ILogger<WizardServiceClass>>();

            // Instantiate the service with the mocked provider and the validator
            _wizardService = new WizardServiceClass(_wizardProviderMock.Object, _validator, logger);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_ValidData_UpsertsSuccessfully()
        {
            // Arrange: Create a valid DTO for Step 1
            var validDto = new StepBudgetInfoDto
            {
                NetSalary = 50000,
                SalaryFrequency = "monthly",
                YearlySalary = 600000,
                HouseholdMembers = new List<HouseholdMemberDto>(), // No household members for individual
                SideHustles = new List<SideHustleDto>()
            };

            // Convert the valid DTO to JSON as it would come from the FE.
            string stepDataJson = JsonConvert.SerializeObject(validDto);

            // Setup the repository's upsert method to simulate success.
            _wizardSqlExecutorMock
                .Setup(x => x.UpsertStepDataAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(true);

            // Act
            var result = await _wizardService.SaveStepDataAsync("test-session-guid", 1, stepDataJson);

            // Assert
            Assert.True(result);
            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                "test-session-guid",
                1,
                It.Is<string>(json => json.Contains("50000") && json.Contains("monthly"))
            ), Times.Once);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_InvalidData_ThrowsException()
        {
            // Arrange: Create an invalid DTO for Step 1 (e.g., NetSalary is 0, which fails validation)
            var invalidDto = new StepBudgetInfoDto
            {
                NetSalary = 0,
                SalaryFrequency = "monthly",
                YearlySalary = 0,
                HouseholdMembers = new List<HouseholdMemberDto>(),
                SideHustles = new List<SideHustleDto>()
            };

            string stepDataJson = JsonConvert.SerializeObject(invalidDto);

            // Act & Assert: Expect an exception due to failed validation.
            var exception = await Assert.ThrowsAsync<Exception>(async () =>
            {
                await _wizardService.SaveStepDataAsync("test-session-guid", 1, stepDataJson);
            });
            Assert.Contains("Validation failed", exception.Message);

            // Verify that the repository's upsert method was never called.
            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()
            ), Times.Never);
        }
        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_UpsertsSuccessfully()
        {
            // Arrange: Create a valid household DTO (IsHousehold = true with one member)
            var validDto = new StepBudgetInfoDto
            {
                NetSalary = 1, 
                SalaryFrequency = "monthly",
                YearlySalary = 0,
                HouseholdMembers = new List<HouseholdMemberDto>
        {
            new HouseholdMemberDto
            {
                Name = "John Doe",
                Income = 30000,
                Frequency = "monthly",
                YearlyIncome = 360000
            }
        },
                SideHustles = new List<SideHustleDto>()
            };

            string json = JsonConvert.SerializeObject(validDto);

            _wizardSqlExecutorMock
                 .Setup(x => x.UpsertStepDataAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()))
                 .ReturnsAsync(true);

            // Act
            var result = await _wizardService.SaveStepDataAsync("test-session-guid", 1, json);

            // Assert
            Assert.True(result);
            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                "test-session-guid",
                1,
                It.Is<string>(s => s.Contains("John Doe") && s.Contains("monthly"))
            ), Times.Once);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_WithNoMembers_UpsertsSuccessfully()
        {
            // Arrange: Create a valid DTO for a household scenario with no household members
            var validDto = new StepBudgetInfoDto
            {
                NetSalary = 1,
                SalaryFrequency = "monthly",
                YearlySalary = 0,
                HouseholdMembers = new List<HouseholdMemberDto>(), // Valid now: can be 0 to N.
                SideHustles = new List<SideHustleDto>()
            };

            string json = JsonConvert.SerializeObject(validDto);

            // Setup the repository's upsert method to simulate success.
            _wizardSqlExecutorMock
                .Setup(x => x.UpsertStepDataAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()))
                .ReturnsAsync(true);

            // Act
            var result = await _wizardService.SaveStepDataAsync("test-session-guid", 1, json);

            // Assert
            Assert.True(result);
            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                "test-session-guid",
                1,
                It.Is<string>(s => s.Contains("monthly"))
            ), Times.Once);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_SideHustleInvalidData_ThrowsException()
        {
            // Arrange: Create a valid individual DTO but with an invalid side hustle (e.g., missing name, income, frequency)
            var invalidDto = new StepBudgetInfoDto
            {
                NetSalary = 50000,
                SalaryFrequency = "monthly",
                YearlySalary = 600000,
                HouseholdMembers = new List<HouseholdMemberDto>(),
                SideHustles = new List<SideHustleDto>
                {
            new SideHustleDto
            {
                Name = "",   // Invalid: empty name
                Income = 0,  // Invalid: should be a positive value
                Frequency = "" // Invalid: missing frequency
            }
        }
            };

            string json = JsonConvert.SerializeObject(invalidDto);

            // Act & Assert: Expect an exception due to invalid side hustle data.
            var exception = await Assert.ThrowsAsync<Exception>(async () =>
            {
                await _wizardService.SaveStepDataAsync("test-session-guid", 1, json);
            });
            Assert.Contains("Ange namn för inkomsten.", exception.Message);

            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()
            ), Times.Never);
        }
        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdMemberInvalidData_ThrowsException()
        {
            // Arrange: Create an invalid DTO for a household scenario with invalid member data.
            var invalidDto = new StepBudgetInfoDto
            {
                NetSalary = 1,
                SalaryFrequency = "monthly",
                YearlySalary = 0,
                HouseholdMembers = new List<HouseholdMemberDto>
        {
            new HouseholdMemberDto
            {
                Name = "", // Invalid
                Income = 30000,
                Frequency = "monthly",
                YearlyIncome = 360000
            }
        },
                SideHustles = new List<SideHustleDto>()
            };

            string json = JsonConvert.SerializeObject(invalidDto);

            // Act & Assert: Expect an exception due to the invalid household member's name.
            var exception = await Assert.ThrowsAsync<Exception>(async () =>
            {
                await _wizardService.SaveStepDataAsync("test-session-guid", 1, json);
            });
            Assert.Contains("Ange namn", exception.Message);

            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>()
            ), Times.Never);
        }
    }
}
