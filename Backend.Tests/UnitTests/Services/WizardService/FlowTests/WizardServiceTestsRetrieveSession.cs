using Backend.Contracts.Wizard;
using Backend.Domain.Entities.Wizard;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Newtonsoft.Json.Linq;
using System.Data.Common;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsRetrieveSessionDictionary
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly Mock<ILogger<WizardServiceClass>> _loggerMock;

        // three validator mocks
        private readonly Mock<IValidator<IncomeFormValues>> _incomeValidatorMock;
        private readonly Mock<IValidator<ExpenditureFormValues>> _expensesValidatorMock;
        private readonly Mock<IValidator<SavingsFormValues>> _savingsValidatorMock;

        private readonly WizardServiceClass _wizardService;

        public WizardServiceTestsRetrieveSessionDictionary()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();
            _loggerMock = new Mock<ILogger<WizardServiceClass>>();

            _wizardProviderMock.Setup(p => p.WizardSqlExecutor)
                               .Returns(_wizardSqlExecutorMock.Object);

            // ─── validator mocks that always succeed ──────────────────────────
            _incomeValidatorMock = CreatePassingValidatorMock<IncomeFormValues>();
            _expensesValidatorMock = CreatePassingValidatorMock<ExpenditureFormValues>();
            _savingsValidatorMock = CreatePassingValidatorMock<SavingsFormValues>();

            // ─── service under test ───────────────────────────────────────────
            _wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                _incomeValidatorMock.Object,
                _expensesValidatorMock.Object,
                _savingsValidatorMock.Object,
                _loggerMock.Object);
        }
        // helper to keep the setup DRY
        private static Mock<IValidator<T>> CreatePassingValidatorMock<T>() where T : class
        {
            var mock = new Mock<IValidator<T>>();

            mock.Setup(v => v.Validate(It.IsAny<T>()))
                .Returns(new ValidationResult());

            return mock;
        }

        [Fact]
        public async Task GetWizardDataAsync_OneRow_ReturnsWizardSavedDataDto()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var wizardSessionId = Guid.NewGuid();

            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 1,
                    SubStep         = 1,
                    StepData        = "{\"netSalary\":1233.0," +
                                      "\"salaryFrequency\":3," +          // 3 == Frequency.Monthly
                                      "\"yearlySalary\":14796.0," +
                                      "\"householdMembers\":[]," +
                                      "\"sideHustles\":[]}",
                    DataVersion     = 2,
                    UpdatedAt       = DateTime.UtcNow
                }
            };

            _wizardProviderMock.Setup(p => p.WizardSqlExecutor
                                            .GetRawWizardStepDataAsync(wizardSessionId,
                                                                       It.IsAny<DbConnection>(),
                                                                       It.IsAny<DbTransaction>()))
                               .ReturnsAsync(rawEntities);

            _wizardProviderMock.Setup(p => p.WizardSqlExecutor
                                            .GetWizardSubStepAsync(wizardSessionId,
                                                                   It.IsAny<DbConnection>(),
                                                                   It.IsAny<DbTransaction>()))
                               .ReturnsAsync(1);

            // ────────── Act ────────────────────────────────────────────────────
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.NotNull(result);

            // DTO-level checks
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            // Contract-level checks
            var income = result.WizardData.Income;
            Assert.NotNull(income);
            Assert.Equal(1233.0m, income!.NetSalary);
            Assert.Equal(Frequency.Monthly, income.SalaryFrequency);
            Assert.Equal(14796.0m, income.YearlySalary);
            Assert.Empty(income.HouseholdMembers);
            Assert.Empty(income.SideHustles);
        }

        [Fact]
        public async Task GetWizardDataAsync_NoRows_ReturnsNull()
        {
            // Arrange: simulate an empty list of raw entities from the database.
            var wizardSessionId = Guid.NewGuid();
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
                    It.Is<It.IsAnyType>((o, t) => o.ToString()!.Contains("No wizard data found for session")),
                    null,
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()
                ), Times.Once);
        }

        [Fact]
        public async Task GetWizardDataAsync_TwoRowsDifferentSteps_ReturnsBothSteps()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var wizardSessionId = Guid.NewGuid();

            // Enum values are sent as numbers (3 == Frequency.Monthly)
            const string step1Json =
                @"{""netSalary"":1000,""salaryFrequency"":3,""yearlySalary"":12000,
           ""householdMembers"":[], ""sideHustles"":[]}";

            // Minimal, but valid, Expenditure JSON
            const string step2Json =
                @"{""rent"":{""monthlyRent"":800}}";

            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 1,
                    SubStep         = 1,
                    StepData        = step1Json,
                    DataVersion     = 2,
                    UpdatedAt       = DateTime.UtcNow
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 2,
                    SubStep         = 1,
                    StepData        = step2Json,
                    DataVersion     = 2,
                    UpdatedAt       = DateTime.UtcNow
                }
            };

            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor
                             .GetRawWizardStepDataAsync(
                                 wizardSessionId,
                                 It.IsAny<DbConnection>(),
                                 It.IsAny<DbTransaction>()))
                .ReturnsAsync(rawEntities);

            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor
                             .GetWizardSubStepAsync(
                                 wizardSessionId,
                                 It.IsAny<DbConnection>(),
                                 It.IsAny<DbTransaction>()))
                .ReturnsAsync(1);

            // ────────── Act ────────────────────────────────────────────────────
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.NotNull(result);

            // high-level DTO
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            // step-1 (Income)
            var income = result.WizardData.Income;
            Assert.NotNull(income);
            Assert.Equal(1000m, income!.NetSalary);
            Assert.Equal(Frequency.Monthly, income.SalaryFrequency);
            Assert.Equal(12000m, income.YearlySalary);

            // step-2 (Expenditure)
            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);
            Assert.Equal(800m, exp!.Rent.MonthlyRent);

            // step-3 (Savings) should be null in this fixture
            Assert.Null(result.WizardData.Savings);
        }

        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepDifferentSubsteps_ReturnsLatestMergedStep()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var wizardSessionId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            const string subStep1Json =
                @"{""rent"":{""homeType"":""Apartment"",""monthlyRent"":1000}}";


            const string subStep2Json =
                @"{""rent"":{""homeType"":""Apartment"",""monthlyRent"":1000},
           ""utilities"":{""electricity"":50,""water"":30}}";

            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 2,
                    SubStep         = 1,
                    StepData        = subStep1Json,
                    DataVersion     = 2,
                    UpdatedAt       = now.AddSeconds(-1)
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 2,
                    SubStep         = 2,
                    StepData        = subStep2Json,
                    DataVersion     = 2,
                    UpdatedAt       = now    
                }
            };

            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                wizardSessionId,
                                It.IsAny<DbConnection>(),
                                It.IsAny<DbTransaction>()))
                .ReturnsAsync(rawEntities);


            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                wizardSessionId,
                                It.IsAny<DbConnection>(),
                                It.IsAny<DbTransaction>()))
                .ReturnsAsync(2);

            // ────────── Act ────────────────────────────────────────────────────
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(2, result.SubStep);

            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);

            // rent
            Assert.Equal("Apartment", exp!.Rent.HomeType);
            Assert.Equal(1000m, exp.Rent.MonthlyRent);

            // utilities
            Assert.Equal(50m, exp.Utilities.Electricity);
            Assert.Equal(30m, exp.Utilities.Water);

            // step-1 & step-3 should be null (only step-2 rows supplied)
            Assert.Null(result.WizardData.Income);
            Assert.Null(result.WizardData.Savings);
        }

        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepSameSubstep_LastRowWins()
        {
            // ────────── Arrange ────────────────────────────────────────────────
            var wizardSessionId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            const string firstJson = @"{""rent"":{""monthlyRent"":1000}}";
            const string latestJson = @"{""utilities"":{""electricity"":50}}";

            var rawEntities = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 2,
                    SubStep         = 1,
                    StepData        = firstJson,
                    DataVersion     = 2,
                    UpdatedAt       = now.AddSeconds(-1)   // earlier
                },
                new WizardStepRowEntity
                {
                    WizardSessionId = Guid.NewGuid(),
                    StepNumber      = 2,
                    SubStep         = 1,                   // same sub-step
                    StepData        = latestJson,
                    DataVersion     = 2,
                    UpdatedAt       = now                  // later  ⇒ chosen
                }
            };

            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                wizardSessionId,
                                It.IsAny<DbConnection>(),
                                It.IsAny<DbTransaction>()))
                .ReturnsAsync(rawEntities);

            _wizardProviderMock
                .Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                wizardSessionId,
                                It.IsAny<DbConnection>(),
                                It.IsAny<DbTransaction>()))
                .ReturnsAsync(1);

            // ────────── Act ────────────────────────────────────────────────────
            var result = await _wizardService.GetWizardDataAsync(wizardSessionId);

            // ────────── Assert ────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);

            // latest row wins: utilities present, rent absent (defaults)
            Assert.Equal(50m, exp!.Utilities.Electricity);
            Assert.Null(exp.Rent);

            // Income / Savings still null
            Assert.Null(result.WizardData.Income);
            Assert.Null(result.WizardData.Savings);
        }
    }
}
