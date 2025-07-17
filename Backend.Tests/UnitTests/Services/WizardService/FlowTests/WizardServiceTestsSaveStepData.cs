using Backend.Application.DTO.Budget;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Domain.Enums;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using Backend.Tests.UnitTests.Helpers;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Data.Common;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

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

        // ─────────────────────────────────────────────────────────────────────────
        [Fact]
        public async Task SaveStepDataAsync_Step1_ValidData_UpsertsSuccessfully()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 50_000m,
                SalaryFrequency = Frequency.Monthly,
                SideHustles = new(),
                HouseholdMembers = new()
            };

            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder();        // pass‑through validators by default

            // stub DB to succeed
            builder.SqlExecutorMock
                   .Setup(e => e.UpsertStepDataAsync(
                              sessionId, 1, 2,
                              It.IsAny<string>(), 2,
                              It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(true);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var ok = await wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.True(ok);

            builder.SqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                sessionId,
                1,
                2,
                It.Is<string>(s =>
                    s.Contains("\"netSalary\":50000") &&
                    s.Contains("\"salaryFrequency\":\"monthly\"")),
                2,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }
        [Fact]
        public async Task SaveStepDataAsync_Step1_InvalidData_ThrowsValidationException()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 0m,                     // invalid (must be > 0)
                YearlySalary = 0m,
                SalaryFrequency = Frequency.Monthly
            };
            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            // Builder supplies default “green‑path” mocks; we override only the one we care about.
            var builder = new WizardServiceBuilder()
                              .WithIncomeValidator(new IncomeValidator());   // real rules for step 1

            var sqlMock = builder.SqlExecutorMock;     // used for verification
            var wizard = builder.Build();

            // ─── Act & Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2));

            Assert.Contains("NetSalary", ex.Message, StringComparison.OrdinalIgnoreCase);

            sqlMock.Verify(e => e.UpsertStepDataAsync(
                               It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                               It.IsAny<string>(), It.IsAny<int>(),
                               It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                           Times.Never);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_UpsertsSuccessfully()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            var dto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new()
                {
                    new()     
                    {
                        Name      = "John Doe",
                        Income    = 30_000m,
                        Frequency = Frequency.Monthly
                    }
                },
                SideHustles = new()
            };

            var json = JsonSerializer.Serialize(dto, Camel);

            var builder = new WizardServiceBuilder();

            builder.SqlExecutorMock
                   .Setup(e => e.UpsertStepDataAsync(
                              sessionId, 1, 2,
                              It.IsAny<string>(), 2,
                              It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(true);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var ok = await wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.True(ok);

            builder.SqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                sessionId,
                1,
                2,
                It.Is<string>(s =>
                    s.Contains("John Doe") &&
                    s.Contains("\"frequency\":\"monthly\"") &&
                    s.Contains("\"netSalary\":1")),
                2,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }



        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdValidData_NoMembers_UpsertsSuccessfully()
        {
            // Arrange
            var dto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                HouseholdMembers = new(),     // zero members is allowed
                SideHustles = new()
            };
            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder();

            builder.SqlExecutorMock
                   .Setup(e => e.UpsertStepDataAsync(
                              sessionId, 1, 2,
                              It.IsAny<string>(), 2,
                              It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(true);

            var wizard = builder.Build();

            // Act
            var ok = await wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2);

            // Assert
            Assert.True(ok);

            builder.SqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                sessionId,
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
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 50_000m,
                SalaryFrequency = Frequency.Monthly,
                ShowSideIncome = false,                    // hidden section
                SideHustles = new()
        {
            new() { Name = "", Income = 0m, Frequency = Frequency.Monthly } // invalid payload
        }
            };

            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder()
                              .WithIncomeValidator(new IncomeValidator());     // real rules for step‑1

            var sqlMock = builder.SqlExecutorMock;
            var wizard = builder.Build();

            // ─── Act / Assert ──────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2));

            Assert.Contains("Side hustles should not be provided", ex.Message,
                            StringComparison.OrdinalIgnoreCase);

            sqlMock.Verify(e => e.UpsertStepDataAsync(
                               It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                               It.IsAny<string>(), It.IsAny<int>(),
                               It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                           Times.Never);
        }

        [Fact]
        public async Task SaveStepDataAsync_Step1_HouseholdMemberInvalidData_ThrowsValidationException()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var dto = new IncomeFormValues
            {
                NetSalary = 1m,
                SalaryFrequency = Frequency.Monthly,
                ShowHouseholdMembers = true,              
                HouseholdMembers = new()
                {
                    new() { Name = "", Income = 30_000m, Frequency = Frequency.Monthly } // invalid
                }
            };
            var json = JsonSerializer.Serialize(dto, Camel);
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder()
                            .WithIncomeValidator(new IncomeValidator());

            var sqlMock = builder.SqlExecutorMock;
            var wizard = builder.Build();

            // ─── Act / Assert ───────────────────────────────────────────────────────
            var ex = await Assert.ThrowsAsync<ValidationException>(() =>
                wizard.SaveStepDataAsync(sessionId, 1, 2, json, 2));

            Assert.Contains("Name is required", ex.Message,
                            StringComparison.OrdinalIgnoreCase);

            sqlMock.Verify(e => e.UpsertStepDataAsync(
                               It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<int>(),
                               It.IsAny<string>(), It.IsAny<int>(),
                               It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()),
                           Times.Never);
        }


        [Fact]
        public async Task SaveStepDataAsync_Step1_StringEnumFrequency_UpsertsSuccessfully()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            const string payload =
                "{\"netSalary\":50000,\"salaryFrequency\":\"monthly\",\"yearlySalary\":600000," +
                "\"householdMembers\":[],\"sideHustles\":[]}";

            var sessionId = Guid.NewGuid();

            // builder provides pass‑through validators for all steps (we only test enum deserialization)
            var builder = new WizardServiceBuilder();

            // stub DB‑call to return true
            builder.SqlExecutorMock
                   .Setup(e => e.UpsertStepDataAsync(
                              It.IsAny<Guid>(), 1, 2,
                              It.IsAny<string>(), 2,
                              It.IsAny<DbConnection?>(), It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(true);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var ok = await wizard.SaveStepDataAsync(
                         sessionId, stepNumber: 1, substepNumber: 2,
                         payload, dataVersion: 2);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.True(ok);

            builder.SqlExecutorMock.Verify(e => e.UpsertStepDataAsync(
                sessionId,
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