using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.WizardQueries;
using Backend.Tests.UnitTests.Helpers;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Data;
using System.Data.Common;
using Xunit;
using static System.Runtime.InteropServices.JavaScript.JSType;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsFinalize
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly Mock<ITransactionRunner> _transactionRunnerMock;
        private readonly Mock<IWizardStepProcessor> _incomeStepProcessorMock;
        private readonly Mock<IValidator<IncomeFormValues>> _incomeValidatorMock;
        private readonly Mock<IValidator<ExpenditureFormValues>> _expensesValidatorMock;
        private readonly Mock<IValidator<SavingsFormValues>> _savingsValidatorMock;
        private readonly WizardServiceClass _wizardService;

        [Fact]
        public async Task FinalizeBudgetAsync_CallsProcessor_WhenDataExists()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            var rows = new List<WizardStepRowEntity>
    {
        new() {
            WizardSessionId = sessionId,           // match the call
            StepNumber      = 1,
            SubStep         = 1,
            StepData        = "{}",
            DataVersion     = 2,
            UpdatedAt       = DateTime.UtcNow
        }
    };

            // 1️⃣ processor that should be executed
            var incomeProcessorMock = new Mock<IWizardStepProcessor>();
            incomeProcessorMock.Setup(p => p.StepNumber).Returns(1);
            incomeProcessorMock.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<Guid>()))
                               .ReturnsAsync(OperationResult.SuccessResult("Success"));

            // 2️⃣ build the service with helper
            var builder = new WizardServiceBuilder()
                            .WithProcessors(new[] { incomeProcessorMock.Object });

            // 3️⃣ supply DB rows
            builder.SqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(
                                             sessionId,
                                             It.IsAny<DbConnection>(),
                                             It.IsAny<DbTransaction>()))
                                   .ReturnsAsync(rows);

            // Unit‑of‑work no‑ops to avoid exceptions
            builder.UnitOfWorkMock.Setup(u => u.BeginTransaction());
            builder.UnitOfWorkMock.Setup(u => u.Commit());

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.FinalizeBudgetAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.True(result.Success);
            Assert.Equal("Budget finalized successfully.", result.Message);

            incomeProcessorMock.Verify(
                p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<Guid>()),
                Times.Once);
        }


        [Fact]
        public async Task FinalizeBudgetAsync_ReturnsFailure_WhenNoDataExists()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder();          // pass‑through validators, mocks

            // executor returns null → service should bail out early
            builder.SqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(
                                             sessionId,
                                             It.IsAny<DbConnection>(),
                                             It.IsAny<DbTransaction>()))
                                   .ReturnsAsync((List<WizardStepRowEntity>?)null);

            // (UoW won’t be touched, but safe to stub)
            builder.UnitOfWorkMock.Setup(u => u.BeginTransaction());
            builder.UnitOfWorkMock.Setup(u => u.Rollback());

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.FinalizeBudgetAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.False(result.Success);
            Assert.Equal("No wizard data found to finalize.", result.Message);

            // prove we never began a transaction
            builder.UnitOfWorkMock.Verify(u => u.BeginTransaction(), Times.Never);
        }


        [Fact]
        public async Task FinalizeBudgetAsync_ReturnsFailure_WhenProcessorFails()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            var sessionId = Guid.NewGuid();

            // Fake row for step‑1
            var rows = new List<WizardStepRowEntity>
            {
                new() { WizardSessionId = sessionId,
                        StepNumber      = 1,
                        SubStep         = 1,
                        StepData        = "{}",
                        DataVersion     = 2,
                        UpdatedAt       = DateTime.UtcNow }
            };

            // 1️⃣ failing processor for step‑1
            var procMock = new Mock<IWizardStepProcessor>();
            procMock.Setup(p => p.StepNumber).Returns(1);
            procMock.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.Is<Guid>(g => g != Guid.Empty)))
                    .ReturnsAsync(OperationResult.FailureResult("Processor failed"));

            // 2️⃣ build service via helper
            var builder = new WizardServiceBuilder()
                            .WithProcessors(new[] { procMock.Object });

            // 3️⃣ plug in DB + UoW behaviour
            builder.SqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(
                                             sessionId,
                                             It.IsAny<DbConnection>(),
                                             It.IsAny<DbTransaction>()))
                                   .ReturnsAsync(rows);

            builder.UnitOfWorkMock.Setup(u => u.BeginTransaction());
            builder.UnitOfWorkMock.Setup(u => u.Commit());
            builder.UnitOfWorkMock.Setup(u => u.Rollback());

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.FinalizeBudgetAsync(sessionId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.False(result.Success);
            Assert.Equal("Processor failed", result.Message);

            // optional: prove Rollback was triggered once
            builder.UnitOfWorkMock.Verify(u => u.Rollback(), Times.Once);
        }
    }
}