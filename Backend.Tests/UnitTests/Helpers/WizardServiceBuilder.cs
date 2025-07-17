using Backend.Application.Interfaces.Wizard;
using Backend.Application.Models.Wizard;
using Backend.Application.Services.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Logging;
using Moq;

namespace Backend.Tests.UnitTests.Helpers;

/// <summary>
/// Centralises mock wiring for <see cref="WizardService"/> so tests stay focused on behaviour.
/// Call <c>new WizardServiceBuilder().WithIncomeValidator(new IncomeValidator()).Build()</c>.
/// </summary>
internal sealed class WizardServiceBuilder
{
    // ─── core mocks ───────────────────────────────────────────────────────────
    private readonly Mock<IWizardSqlProvider> _providerMock = new();
    private readonly Mock<IUnitOfWork> _uowMock = new();
    private readonly Mock<IWizardSqlExecutor> _sqlExecMock = new();
    private ILogger<WizardService> _logger = Mock.Of<ILogger<WizardService>>();

    // default “green‑path” validators
    private IValidator<IncomeFormValues> _incomeValidator = PassingValidator<IncomeFormValues>();
    private IValidator<ExpenditureFormValues> _expensesValidator = PassingValidator<ExpenditureFormValues>();
    private IValidator<SavingsFormValues> _savingsValidator = PassingValidator<SavingsFormValues>();
    private IEnumerable<IWizardStepProcessor> _processors = Enumerable.Empty<IWizardStepProcessor>();

    // ─── exposed mocks for verification ───────────────────────────────────────
    public Mock<IWizardSqlExecutor> SqlExecutorMock => _sqlExecMock;
    public Mock<IWizardSqlProvider> ProviderMock => _providerMock;
    public Mock<IUnitOfWork> UnitOfWorkMock => _uowMock;

    // ─── fluent overrides ─────────────────────────────────────────────────────
    public WizardServiceBuilder WithIncomeValidator(IValidator<IncomeFormValues> v) { _incomeValidator = v; return this; }
    public WizardServiceBuilder WithExpenditureValidator(IValidator<ExpenditureFormValues> v) { _expensesValidator = v; return this; }
    public WizardServiceBuilder WithSavingsValidator(IValidator<SavingsFormValues> v) { _savingsValidator = v; return this; }
    public WizardServiceBuilder WithProcessors(IEnumerable<IWizardStepProcessor> p) { _processors = p; return this; }

    // ─── ctor: wire provider → executor ───────────────────────────────────────
    public WizardServiceBuilder()
    {
        // production code asks provider.Executor => give back our sqlExecMock
        _providerMock.Setup(p => p.WizardSqlExecutor).Returns(_sqlExecMock.Object);
    }
    public WizardServiceBuilder WithLogger(ILogger<WizardService> logger)
    {
        _logger = logger;
        return this;
    }
    // ─── build the system under test ──────────────────────────────────────────
    public WizardService Build() => new(
        _providerMock.Object,
        _incomeValidator,
        _expensesValidator,
        _savingsValidator,
        _uowMock.Object,
        _logger,                    // ← use the field here
        Mock.Of<ITransactionRunner>(),
        _processors);

    // ─── helper: always‑valid validator ───────────────────────────────────────
    private static IValidator<T> PassingValidator<T>() where T : class
    {
        var m = new Mock<IValidator<T>>();
        m.Setup(v => v.Validate(It.IsAny<T>())).Returns(new ValidationResult());
        return m.Object;
    }
}
