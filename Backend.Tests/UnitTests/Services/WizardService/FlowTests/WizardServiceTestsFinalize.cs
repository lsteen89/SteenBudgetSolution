using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using System.Data;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;
using System.Data.Common;

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

        public WizardServiceTestsFinalize()
        {
            _wizardProviderMock = new Mock<IWizardSqlProvider>();
            _wizardSqlExecutorMock = new Mock<IWizardSqlExecutor>();
            _transactionRunnerMock = new Mock<ITransactionRunner>();
            _incomeStepProcessorMock = new Mock<IWizardStepProcessor>();

            _wizardProviderMock.Setup(p => p.WizardSqlExecutor).Returns(_wizardSqlExecutorMock.Object);

            _incomeValidatorMock = CreatePassingValidatorMock<IncomeFormValues>();
            _expensesValidatorMock = CreatePassingValidatorMock<ExpenditureFormValues>();
            _savingsValidatorMock = CreatePassingValidatorMock<SavingsFormValues>();

            var stepProcessors = new[] { _incomeStepProcessorMock.Object };

            _transactionRunnerMock
                .Setup(tr => tr.ExecuteAsync<OperationResult>(
                    It.IsAny<Func<DbConnection, DbTransaction, Task<OperationResult>>>()))
                .Returns((Func<DbConnection, DbTransaction, Task<OperationResult>> work) =>
                {
                    var conn = new Mock<DbConnection>().Object;     
                    var tx = new Mock<DbTransaction>().Object;
                    return work(conn, tx);                          
                });

            _wizardService = new WizardServiceClass(
                _wizardProviderMock.Object,
                _incomeValidatorMock.Object,
                _expensesValidatorMock.Object,
                _savingsValidatorMock.Object,
                Mock.Of<ILogger<WizardServiceClass>>(),
                _transactionRunnerMock.Object,
                stepProcessors);
        }

        private static Mock<IValidator<T>> CreatePassingValidatorMock<T>() where T : class
        {
            var m = new Mock<IValidator<T>>();
            m.Setup(v => v.Validate(It.IsAny<T>())).Returns(new ValidationResult());
            return m;
        }

        [Fact]
        public async Task FinalizeBudgetAsync_CallsProcessor_WhenDataExists()
        {
            // Arrange
            var sessionId = Guid.NewGuid();
            var wizardData = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity { StepNumber = 1, StepData = "{}" }
            };

            _wizardSqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(sessionId, null, null)).ReturnsAsync(wizardData);
            _incomeStepProcessorMock.Setup(p => p.StepNumber).Returns(1);
            _incomeStepProcessorMock.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IDbConnection>(), It.IsAny<IDbTransaction>()))
                .ReturnsAsync(OperationResult.SuccessResult("Success"));

            // Act
            var result = await _wizardService.FinalizeBudgetAsync(sessionId);

            // Assert
            Assert.True(result.Success);
            _incomeStepProcessorMock.Verify(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IDbConnection>(), It.IsAny<IDbTransaction>()), Times.Once);
        }

        [Fact]
        public async Task FinalizeBudgetAsync_ReturnsFailure_WhenNoDataExists()
        {
            // Arrange
            var sessionId = Guid.NewGuid();
            _wizardSqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(sessionId, null, null)).ReturnsAsync((List<WizardStepRowEntity>)null);

            // Act
            var result = await _wizardService.FinalizeBudgetAsync(sessionId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal("No wizard data found to finalize.", result.Message);
        }

        [Fact]
        public async Task FinalizeBudgetAsync_ReturnsFailure_WhenProcessorFails()
        {
            // Arrange
            var sessionId = Guid.NewGuid();
            var wizardData = new List<WizardStepRowEntity>
            {
                new WizardStepRowEntity { StepNumber = 1, StepData = "{}" }
            };

            _wizardSqlExecutorMock.Setup(e => e.GetRawWizardStepDataAsync(sessionId, null, null)).ReturnsAsync(wizardData);
            _incomeStepProcessorMock.Setup(p => p.StepNumber).Returns(1);
            _incomeStepProcessorMock.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IDbConnection>(), It.IsAny<IDbTransaction>()))
                .ReturnsAsync(OperationResult.FailureResult("Processor failed"));

            // Act
            var result = await _wizardService.FinalizeBudgetAsync(sessionId);

            // Assert
            Assert.False(result.Success);
            Assert.Equal("Processor failed", result.Message);
        }
    }
}