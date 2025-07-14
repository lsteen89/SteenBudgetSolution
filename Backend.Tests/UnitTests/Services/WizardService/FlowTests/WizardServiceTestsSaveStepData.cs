using Backend.Application.DTO.Budget;
using Backend.Application.Interfaces.Wizard;
using Backend.Domain.Enums;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Data.Common;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;
using Backend.Application.Models.Wizard;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsSaveStepData
    {
        protected readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        protected readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        protected readonly Mock<IValidator<IncomeFormValues>> _incomeValidatorMock;
        protected readonly Mock<IValidator<ExpenditureFormValues>> _expensesValidatorMock;
        protected readonly Mock<IValidator<SavingsFormValues>> _savingsValidatorMock;
        protected readonly Mock<ITransactionRunner> _transactionRunnerMock;
        protected readonly WizardServiceClass _wizardService;

        protected static readonly JsonSerializerOptions Camel = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public WizardServiceTestsSaveStepData()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();
            _transactionRunnerMock = new Mock<ITransactionRunner>();

            _wizardProviderMock.Setup(p => p.WizardSqlExecutor)
                               .Returns(_wizardSqlExecutorMock.Object);

            // validators that always succeed
            _incomeValidatorMock = CreatePassingValidatorMock<IncomeFormValues>();
            _expensesValidatorMock = CreatePassingValidatorMock<ExpenditureFormValues>();
            _savingsValidatorMock = CreatePassingValidatorMock<SavingsFormValues>();

            var logger = Mock.Of<ILogger<WizardServiceClass>>();

            _wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                _incomeValidatorMock.Object,
                _expensesValidatorMock.Object,
                _savingsValidatorMock.Object,
                logger,
                _transactionRunnerMock.Object,
                new List<IWizardStepProcessor>());
        }

        protected static Mock<IValidator<T>> CreatePassingValidatorMock<T>() where T : class
        {
            var m = new Mock<IValidator<T>>();
            m.Setup(v => v.Validate(It.IsAny<T>()))
             .Returns(new ValidationResult());     // always valid
            return m;
        }

        // ─────────────────────────────────────────────────────────────────────────
        [Fact]
        public async Task SaveStepDataAsync_Step1_ValidData_UpsertsSuccessfully()
        {
            // Arrange – build a valid IncomeFormValues payload
            var validDto = new IncomeFormValues
            {
                NetSalary = 50_000m,
                SalaryFrequency = Frequency.Monthly,
                SideHustles = new(),
                HouseholdMembers = new()
            };

            string json = JsonSerializer.Serialize(validDto, Camel);
            var wizardSessionId = System.Guid.NewGuid();

            _wizardSqlExecutorMock
                .Setup(x => x.UpsertStepDataAsync(
                           It.IsAny<System.Guid>(),
                           It.IsAny<int>(),
                           It.IsAny<int>(),
                           It.IsAny<string>(),
                           It.IsAny<int>(),
                           It.IsAny<DbConnection?>(),    
                           It.IsAny<DbTransaction?>())) 
                .ReturnsAsync(true);

            // Act
            var ok = await _wizardService.SaveStepDataAsync(
                         wizardSessionId, 1, 2, json, 2);

            // Assert – service reports success
            Assert.True(ok);

            // & repository received JSON containing key data
            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                wizardSessionId, // session ID
                1,
                2,
                It.Is<string>(s =>
                    s.Contains("\"netSalary\":50000") &&
                    s.Contains("\"salaryFrequency\":\"monthly\"")), // string
                2,
                It.IsAny<DbConnection?>(),              
                It.IsAny<DbTransaction?>()),          
                Times.Once);
        }
        [Fact]
        public async Task SaveStepDataAsync_Step1_InvalidData_ThrowsValidationException()
        {
            // ── Arrange ───────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 0m,                    // invalid (must be > 0)
                SalaryFrequency = Frequency.Monthly,
                YearlySalary = 0m
            };
            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = System.Guid.NewGuid();
            // real validator that contains the rules for step 1
            var incomeValidator = new IncomeValidator();

            // passing mocks for the other two steps
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,         
                expensesValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>(),
                Mock.Of<ITransactionRunner>(),              
                Enumerable.Empty<IWizardStepProcessor>());    

            // DB layer shouldn’t be called at all
            _wizardSqlExecutorMock.Setup(e => e.UpsertStepDataAsync(
                        It.IsAny<System.Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                        It.IsAny<string>(), It.IsAny<int>(),
                        It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                        .ReturnsAsync(true);

            // ── Act & Assert ──────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 1, 2, json, 2));

            Assert.Contains("NetSalary", ex.Message);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<System.Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_UpsertsSuccessfully()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var wizardSessionId = System.Guid.NewGuid();

            var validDto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new()
                {
                    new HouseholdMember
                    {
                        Name         = "John Doe",
                        Income       = 30_000m,
                        Frequency    = Frequency.Monthly
                    }
                },
                SideHustles = new()
            };

            string json = JsonSerializer.Serialize(validDto, Camel);

            _wizardSqlExecutorMock
                .Setup(x => x.UpsertStepDataAsync(
                           It.IsAny<System.Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                           It.IsAny<string>(), It.IsAny<int>(),
                           It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            // ────────── Act ────────────────────────────────────────────────────
            var ok = await _wizardService.SaveStepDataAsync(
                         wizardSessionId, stepNumber: 1, substepNumber: 2,
                         json, dataVersion: 2);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.True(ok);

            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                wizardSessionId, // session ID
                1,
                2,
                It.Is<string>(s =>
                    s.Contains("John Doe") &&   // name
                    s.Contains("\"frequency\":\"monthly\"") &&   
                    s.Contains("\"netSalary\":1")),        // quick sanity check
                2,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_NoMembers_UpsertsSuccessfully()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new(),   // ✓ zero members is allowed
                SideHustles = new()
            };
            
            var wizardSessionId = System.Guid.NewGuid();
            string json = JsonSerializer.Serialize(dto, Camel);

            _wizardSqlExecutorMock
                .Setup(x => x.UpsertStepDataAsync(
                           It.IsAny<System.Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                           It.IsAny<string>(), It.IsAny<int>(),
                           It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            // ───────── Act ────────────────────────────────────────────────────
            var ok = await _wizardService.SaveStepDataAsync(
                         wizardSessionId, stepNumber: 1, substepNumber: 2,
                         json, dataVersion: 2);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.True(ok);

            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                wizardSessionId,
                1,
                2,
                It.Is<string>(s =>
                s.Contains("\"salaryFrequency\":\"monthly\"") &&
                    s.Contains("\"netSalary\":1")),
                2,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step1_SideHustleInvalidData_ThrowsValidationException()
        {
            // ── Arrange ──────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 50_000m,
                SalaryFrequency = Frequency.Monthly,

                ShowSideIncome = false,          // section hidden
                SideHustles = new()           // but payload sent → should fail
                {
                    new SideHustle
                    {
                        Name          = "",        // invalid
                        Income        = 0m,        // invalid
                        Frequency     = Frequency.Monthly
                    }
                }
            };

            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = Guid.NewGuid();

            var incomeValidator = new IncomeValidator();                   // real one
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,                      // ← inject the *real* validator
                expensesValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>(),
                _transactionRunnerMock.Object,
                Enumerable.Empty<IWizardStepProcessor>());

            _wizardSqlExecutorMock
                .Setup(e => e.UpsertStepDataAsync(
                           It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                           It.IsAny<string>(), It.IsAny<int>(),
                           It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            // ── Act & Assert ─────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 1, 2, json, 2));

            Assert.Contains("Side hustles should not be provided when the section is hidden",
                            ex.Message,
                            StringComparison.OrdinalIgnoreCase);

            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }

        public async Task SaveStepDataAsync_Step1_HouseholdMemberInvalidData_ThrowsValidationException()
        {
            // ── Arrange ───────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new()
        {
            new HouseholdMember           // invalid → empty Name
            {
                Name      = "",
                Income    = 30_000m,
                Frequency = Frequency.Monthly
            }
        }
            };
            string json = JsonSerializer.Serialize(dto, Camel);
            var wizardSessionId = System.Guid.NewGuid();
            // real failing validator for step 1
            var incomeValidator = new IncomeValidator();

            // passing mocks for steps 2 & 3
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                new Mock<IValidator<IncomeFormValues>>().Object,
                expensesValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>(),
                _transactionRunnerMock.Object,
                new List<IWizardStepProcessor>());

            // Act  &  Assert
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizardService.SaveStepDataAsync(wizardSessionId, 1, 2, json, 2));

            Assert.Contains("Household member name is required", ex.Message);

            _wizardSqlExecutorMock.Verify(x => x.UpsertStepDataAsync(
                It.IsAny<System.Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                It.IsAny<string>(), It.IsAny<int>(),
                It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                Times.Never);
        }
        [Fact]
        public async Task SaveStepDataAsync_Step1_StringEnumFrequency_UpsertsSuccessfully()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            const string payload =
                "{\"netSalary\":50000,\"salaryFrequency\":\"monthly\",\"yearlySalary\":600000,\"householdMembers\":[],\"sideHustles\":[]}";


            // all three validators succeed (we merely test enum deserialization)
            var incomeValidator = CreatePassingValidatorMock<IncomeFormValues>().Object;
            var expensesValidator = CreatePassingValidatorMock<ExpenditureFormValues>().Object;
            var savingsValidator = CreatePassingValidatorMock<SavingsFormValues>().Object;
            var wizardSessionId = System.Guid.NewGuid();

            _wizardSqlExecutorMock
                .Setup(e => e.UpsertStepDataAsync(
                           It.IsAny<System.Guid>(), 1, 2,
                           It.IsAny<string>(), 2,
                           It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                .ReturnsAsync(true);

            var wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                incomeValidator,
                expensesValidator,
                savingsValidator,
                Mock.Of<ILogger<WizardServiceClass>>(),
                _transactionRunnerMock.Object,
                new List<IWizardStepProcessor>());

            // ────────── Act ────────────────────────────────────────────────────
            var ok = await wizardService.SaveStepDataAsync(
                         wizardSessionId, stepNumber: 1, substepNumber: 2,
                         payload, dataVersion: 2);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.True(ok);

            // verify DB called once with serialized JSON that now contains enum *number* 3
            _wizardSqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                wizardSessionId,
                1,
                2,
                It.Is<string>(s =>
                    s.Contains("\"salaryFrequency\":\"monthly\"") &&
                    s.Contains("\"netSalary\":50000")),
                2,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }

    }
}