using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Wizard.Finalization.Processing.Targets;

namespace Backend.Application.Features.Wizard.Finalization.Targets;

public sealed class FinalizeBudgetTargetFactory : IFinalizeBudgetTargetFactory
{
    private readonly IIncomeRepository _incomeRepository;
    private readonly IExpenditureRepository _expenditureRepository;
    private readonly ISavingsRepository _savingsRepository;
    private readonly IDebtsRepository _debtsRepository;
    private readonly IBudgetRepository _budgetRepository;

    public FinalizeBudgetTargetFactory(
        IIncomeRepository incomeRepository,
        IExpenditureRepository expenditureRepository,
        ISavingsRepository savingsRepository,
        IDebtsRepository debtsRepository,
        IBudgetRepository budgetRepository)
    {
        _incomeRepository = incomeRepository;
        _expenditureRepository = expenditureRepository;
        _savingsRepository = savingsRepository;
        _debtsRepository = debtsRepository;
        _budgetRepository = budgetRepository;
    }

    public IWizardFinalizationTarget Create(Guid budgetId) =>
        new FinalizeBudgetTarget(
            budgetId,
            _incomeRepository,
            _expenditureRepository,
            _savingsRepository,
            _debtsRepository,
            _budgetRepository);
}
