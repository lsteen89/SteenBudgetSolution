using Backend.Application.Models.Wizard;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using Backend.Tests.UnitTests.Helpers;
using FluentValidation;
using Moq;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;
using System.Data.Common;

namespace Backend.Tests.UnitTests.Services.WizardService.FlowTests
{
    public class WizardServiceTestsCreateSession
    {
        private readonly Mock<IWizardSqlProvider> _wizardProviderMock;
        private readonly Mock<IWizardSqlExecutor> _wizardSqlExecutorMock;
        private readonly Mock<IValidator<IncomeFormValues>> _incomeValidatorMock;
        private readonly Mock<IValidator<ExpenditureFormValues>> _expensesValidatorMock;
        private readonly Mock<IValidator<SavingsFormValues>> _savingsValidatorMock;
        private readonly Mock<ITransactionRunner> _transactionRunnerMock;
        private readonly WizardServiceClass _wizardService;

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsSuccess_WhenSqlExecutorReturnsValidGuid()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            Guid personId = Guid.NewGuid();      // persoid (first ctor arg)
            Guid sessionId = Guid.NewGuid();      // value the executor will return

            var builder = new WizardServiceBuilder();   // auto‑mocks everything

            // Wire the *same* executor the service receives
            builder.SqlExecutorMock
                   .Setup(e => e.CreateWizardAsync(
                              personId,
                              It.IsAny<DbConnection?>(),
                              It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(sessionId);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.CreateWizardSessionAsync(personId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.True(result.IsSuccess);
            Assert.Equal(sessionId, result.WizardSessionId);
            Assert.Equal("Wizard session created successfully.", result.Message);

            // optional: verify executor called once
            builder.SqlExecutorMock.Verify(e => e.CreateWizardAsync(
                personId,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsFailure_WhenSqlExecutorReturnsEmptyGuid()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            Guid personId = Guid.NewGuid();   // persoid

            var builder = new WizardServiceBuilder();          // default mocks

            // Executor returns Guid.Empty ⇒ service should fail
            builder.SqlExecutorMock
                   .Setup(e => e.CreateWizardAsync(
                              personId,
                              It.IsAny<DbConnection?>(),
                              It.IsAny<DbTransaction?>()))
                   .ReturnsAsync(Guid.Empty);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.CreateWizardSessionAsync(personId);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.False(result.IsSuccess);
            Assert.Equal(Guid.Empty, result.WizardSessionId);
            Assert.Equal("Failed to create wizard session.", result.Message);

            builder.SqlExecutorMock.Verify(e => e.CreateWizardAsync(
                personId,
                It.IsAny<DbConnection?>(),
                It.IsAny<DbTransaction?>()),
                Times.Once);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsGuid_WhenSessionExists()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            Guid persoid = Guid.NewGuid();
            Guid sessionId = Guid.NewGuid();

            var builder = new WizardServiceBuilder();               // auto‑mocks everything

            builder.SqlExecutorMock
                   .Setup(e => e.GetWizardSessionIdAsync(
                              persoid,
                              It.IsAny<System.Data.Common.DbConnection?>(),
                              It.IsAny<System.Data.Common.DbTransaction?>()))
                   .ReturnsAsync(sessionId);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.UserHasWizardSessionAsync(persoid);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.Equal(sessionId, result);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsEmptyGuid_WhenNoSessionExists()
        {
            // ─── Arrange ───────────────────────────────────────────────────────────
            Guid persoid = Guid.NewGuid();

            var builder = new WizardServiceBuilder();     // auto‑mocks everything

            // executor returns null ⇒ service should translate to Guid.Empty
            builder.SqlExecutorMock
                   .Setup(e => e.GetWizardSessionIdAsync(
                              persoid,
                              It.IsAny<DbConnection?>(),        
                              It.IsAny<DbTransaction?>()))
                   .ReturnsAsync((Guid?)null);

            var wizard = builder.Build();

            // ─── Act ───────────────────────────────────────────────────────────────
            var result = await wizard.UserHasWizardSessionAsync(persoid);

            // ─── Assert ────────────────────────────────────────────────────────────
            Assert.Equal(Guid.Empty, result);
        }
    }
}
