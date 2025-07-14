using Backend.Application.Interfaces.Wizard;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using WizardServiceClass = Backend.Application.Services.WizardService.WizardService;
using Backend.Application.Models.Wizard;

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

        public WizardServiceTestsCreateSession()
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

        private static Mock<IValidator<T>> CreatePassingValidatorMock<T>() where T : class
        {
            var m = new Mock<IValidator<T>>();
            m.Setup(v => v.Validate(It.IsAny<T>())).Returns(new ValidationResult());

            return m;
        }

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsSuccess_WhenSqlExecutorReturnsValidGuid()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid validGuid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.CreateWizardAsync(validGuid, null, null))
                .ReturnsAsync(validGuid);

            // Act
            var result = await _wizardService.CreateWizardSessionAsync(validGuid);

            // Assert
            Assert.True(result.IsSuccess);
            Assert.Equal(validGuid, result.WizardSessionId);
            Assert.Equal("Wizard session created successfully.", result.Message);
        }

        [Fact]
        public async Task CreateWizardSessionAsync_ReturnsFailure_WhenSqlExecutorReturnsEmptyGuid()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid validGuid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.CreateWizardAsync(validGuid, null, null))
                .ReturnsAsync(Guid.Empty);

            // Act
            var result = await _wizardService.CreateWizardSessionAsync(validGuid);

            // Assert
            Assert.False(result.IsSuccess);
            Assert.Equal(Guid.Empty, result.WizardSessionId);
            Assert.Equal("Failed to create wizard session.", result.Message);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsGuid_WhenSessionExists()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid persoid = Guid.NewGuid();
            Guid sessionGuid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardSessionIdAsync(persoid, null, null))
                .ReturnsAsync(sessionGuid);

            // Act
            var result = await _wizardService.UserHasWizardSessionAsync(persoid);

            // Assert
            Assert.Equal(sessionGuid, result);
        }

        [Fact]
        public async Task UserHasWizardSessionAsync_ReturnsEmptyGuid_WhenNoSessionExists()
        {
            // Arrange
            string testEmail = "test@example.com";
            Guid persoid = Guid.NewGuid();
            _wizardSqlExecutorMock
                .Setup(x => x.GetWizardSessionIdAsync(persoid, null, null))
                .ReturnsAsync((Guid?)null);

            // Act
            var result = await _wizardService.UserHasWizardSessionAsync(persoid);

            // Assert
            Assert.Equal(Guid.Empty, result);
        }
    }
}
