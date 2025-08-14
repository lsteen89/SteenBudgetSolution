using Backend.Application.DTO.Budget;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Enums;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.WizardQueries;
using Backend.Tests.UnitTests.Helpers;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Collections.Generic;
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
        private readonly Mock<ITransactionRunner> _transactionRunnerMock;

        // three validator mocks
        private readonly Mock<IValidator<IncomeFormValues>> _incomeValidatorMock;
        private readonly Mock<IValidator<ExpenditureFormValues>> _expensesValidatorMock;
        private readonly Mock<IValidator<SavingsFormValues>> _savingsValidatorMock;

        private readonly WizardServiceClass _wizardService;

        [Fact]
        public async Task GetWizardDataAsync_OneRow_ReturnsWizardSavedDataDto()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            var rows = new List<WizardStepRowEntity>
    {
        new()
        {
            WizardSessionId = sessionId,            // ← same ID
            StepNumber      = 1,
            SubStep         = 1,
            StepData        = "{\"netSalary\":1233.0," +
                              "\"salaryFrequency\":3," +   // 3 == monthly
                              "\"yearlySalary\":14796.0," +
                              "\"householdMembers\":[]," +
                              "\"sideHustles\":[]}",
            DataVersion     = 2,
            UpdatedAt       = DateTime.UtcNow
        }
    };

            var builder = new WizardServiceBuilder();   // pass‑through validators
            var providerMock = builder.ProviderMock;

            providerMock.Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(rows);

            providerMock.Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(1);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.GetWizardDataAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            var income = result.WizardData.Income;
            Assert.NotNull(income);
            Assert.Equal(1233.0m, income!.NetSalary);
            Assert.Equal(Frequency.Monthly, income.SalaryFrequency);
            Assert.Empty(income.HouseholdMembers);
            Assert.Empty(income.SideHustles);
        }


        [Fact]
        public async Task GetWizardDataAsync_NoRows_ReturnsNull()
        {
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder();

            // logger mock you can verify
            var loggerMock = new Mock<ILogger<WizardServiceClass>>();
            builder.WithLogger(loggerMock.Object);

            // provider: no rows
            builder.ProviderMock.Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                           sessionId,
                                           It.IsAny<DbConnection>(),
                                           It.IsAny<DbTransaction>()))
                                .ReturnsAsync((List<WizardStepRowEntity>?)null);

            // sub‑step (won’t be used but keep it tidy)
            builder.ProviderMock.Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                           sessionId,
                                           It.IsAny<DbConnection>(),
                                           It.IsAny<DbTransaction>()))
                                .ReturnsAsync(0);

            var wizard = builder.Build();

            // Act
            var result = await wizard.GetWizardDataAsync(sessionId);

            // Assert
            Assert.Null(result);

            loggerMock.Verify(
                l => l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, _) =>
                        v.ToString()!.Contains("No wizard data found for session")),
                    null,
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }


        [Fact]
        public async Task GetWizardDataAsync_TwoRowsDifferentSteps_ReturnsBothSteps()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            // step‑1 (Income) – enum sent as number (3 ⇒ monthly)
            const string step1Json =
                """
        {
          "netSalary": 1000,
          "salaryFrequency": 3,
          "yearlySalary": 12000,
          "householdMembers": [],
          "sideHustles": []
        }
        """;

            // step‑2 (Expenditure)
            const string step2Json =
                """
        {
          "rent": { "monthlyRent": 800 }
        }
        """;

            var rows = new List<WizardStepRowEntity>
    {
        new()
        {
            WizardSessionId = sessionId,   // same ID
            StepNumber      = 1,
            SubStep         = 1,
            StepData        = step1Json,
            DataVersion     = 2,
            UpdatedAt       = DateTime.UtcNow
        },
        new()
        {
            WizardSessionId = sessionId,   // same ID
            StepNumber      = 2,
            SubStep         = 1,
            StepData        = step2Json,
            DataVersion     = 2,
            UpdatedAt       = DateTime.UtcNow
        }
    };

            var builder = new WizardServiceBuilder();   // default pass‑through validators
            var providerMock = builder.ProviderMock;         // same instance injected into service

            providerMock.Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(rows);

            providerMock.Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(1);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.GetWizardDataAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            // step‑1 (Income)
            var income = result.WizardData.Income;
            Assert.NotNull(income);
            Assert.Equal(1000m, income!.NetSalary);
            Assert.Equal(Frequency.Monthly, income.SalaryFrequency);

            // step‑2 (Expenditure)
            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);
            Assert.Equal(800m, exp!.Rent.MonthlyRent);

            // step‑3 (Savings) absent
            Assert.Null(result.WizardData.Savings);
        }


        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepDifferentSubsteps_ReturnsLatestMergedStep()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            const string subStep1Json =
                """
        {
          "rent": { "homeType": "Apartment", "monthlyRent": 1000 }
        }
        """;

            const string subStep2Json =
                """
        {
          "rent":      { "homeType": "Apartment", "monthlyRent": 1000 },
          "utilities": { "electricity": 50, "water": 30 }
        }
        """;

            var rawEntities = new List<WizardStepRowEntity>
    {
        new WizardStepRowEntity
        {
            WizardSessionId = sessionId,   // same ID
            StepNumber      = 2,
            SubStep         = 1,
            StepData        = subStep1Json,
            DataVersion     = 2,
            UpdatedAt       = now.AddSeconds(-1)
        },
        new WizardStepRowEntity
        {
            WizardSessionId = sessionId,   // same ID
            StepNumber      = 2,
            SubStep         = 2,
            StepData        = subStep2Json,
            DataVersion     = 2,
            UpdatedAt       = now
        }
    };

            var builder = new WizardServiceBuilder();          // default pass‑through validators
            var providerMock = builder.ProviderMock;                // same instance injected into service

            providerMock.Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(rawEntities);

            providerMock.Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                    sessionId,
                                    It.IsAny<DbConnection>(),
                                    It.IsAny<DbTransaction>()))
                        .ReturnsAsync(2);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.GetWizardDataAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(2, result.SubStep);

            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);

            // merged values from latest sub‑step (2)
            Assert.Equal("Apartment", exp!.Rent.HomeType);
            Assert.Equal(1000m, exp.Rent.MonthlyRent);
            Assert.Equal(50m, exp.Utilities.Electricity);
            Assert.Equal(30m, exp.Utilities.Water);

            // other steps remain null
            Assert.Null(result.WizardData.Income);
            Assert.Null(result.WizardData.Savings);
        }


        [Fact]
        public async Task GetWizardDataAsync_TwoRowsSameStepSameSubstep_LastRowWins()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            const string firstJson =
                """
        { "rent": { "monthlyRent": 1000 } }
        """;
            const string latestJson =
                """
        { "utilities": { "electricity": 50 } }
        """;

            var rawEntities = new List<WizardStepRowEntity>
    {
        new WizardStepRowEntity
        {
            WizardSessionId = sessionId,   // ← same ID
            StepNumber      = 2,
            SubStep         = 1,
            StepData        = firstJson,
            DataVersion     = 2,
            UpdatedAt       = now.AddSeconds(-1)
        },
        new WizardStepRowEntity
        {
            WizardSessionId = sessionId,   // ← same ID
            StepNumber      = 2,
            SubStep         = 1,
            StepData        = latestJson,
            DataVersion     = 2,
            UpdatedAt       = now                 // later → should win
        }
    };

            var builder = new WizardServiceBuilder();             // pass-through validators
            var providerMock = builder.ProviderMock;              // expose to set up DB calls

            providerMock.Setup(p => p.WizardSqlExecutor.GetRawWizardStepDataAsync(
                                     sessionId,
                                     It.IsAny<DbConnection>(),
                                     It.IsAny<DbTransaction>()))
                        .ReturnsAsync(rawEntities);

            providerMock.Setup(p => p.WizardSqlExecutor.GetWizardSubStepAsync(
                                     sessionId,
                                     It.IsAny<DbConnection>(),
                                     It.IsAny<DbTransaction>()))
                        .ReturnsAsync(1);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.GetWizardDataAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.NotNull(result);
            Assert.Equal(2, result!.DataVersion);
            Assert.Equal(1, result.SubStep);

            var exp = result.WizardData.Expenditure;
            Assert.NotNull(exp);
            Assert.Equal(50m, exp!.Utilities.Electricity);  // last row wins
            Assert.Null(exp.Rent);                          // rent absent

            Assert.Null(result.WizardData.Income);
            Assert.Null(result.WizardData.Savings);
        }

    }
}