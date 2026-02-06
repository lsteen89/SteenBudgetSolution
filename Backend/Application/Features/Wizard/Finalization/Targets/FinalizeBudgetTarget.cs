using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Debt;
using Backend.Application.DTO.Budget.Expenditure;
using Backend.Application.DTO.Budget.Income;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Targets;

public sealed class FinalizeBudgetTarget
    : IIncomeTarget, IExpenditureTarget, ISavingsTarget, IDebtTarget
{
    private readonly Guid _budgetId;

    private readonly IIncomeRepository _incomeRepository;
    private readonly IExpenditureRepository _expenditureRepository;
    private readonly ISavingsRepository _savingsRepository;
    private readonly IDebtsRepository _debtsRepository;
    private readonly IBudgetRepository _budgetRepository;

    public FinalizeBudgetTarget(
        Guid budgetId,
        IIncomeRepository incomeRepository,
        IExpenditureRepository expenditureRepository,
        ISavingsRepository savingsRepository,
        IDebtsRepository debtsRepository,
        IBudgetRepository budgetRepository)
    {
        _budgetId = budgetId;
        _incomeRepository = incomeRepository;
        _expenditureRepository = expenditureRepository;
        _savingsRepository = savingsRepository;
        _debtsRepository = debtsRepository;
        _budgetRepository = budgetRepository;
    }

    public async Task<Result> ApplyIncomeAsync(IncomeData dto, CancellationToken ct)
    {
        var income = dto.ToDomain(_budgetId);
        await _incomeRepository.AddAsync(income, _budgetId, ct);
        return Result.Success();
    }

    public async Task<Result> ApplyExpenditureAsync(ExpenditureData dto, CancellationToken ct)
    {
        var expenditure = dto.ToUnifiedExpense(_budgetId);
        await _expenditureRepository.AddAsync(expenditure, _budgetId, ct);
        return Result.Success();
    }

    public async Task<Result> ApplySavingsAsync(SavingsData dto, CancellationToken ct)
    {
        var savings = dto.ToDomain(_budgetId);
        await _savingsRepository.AddAsync(savings, _budgetId, ct);
        return Result.Success();
    }

    public async Task<Result> ApplyDebtAsync(DebtData dto, CancellationToken ct)
    {
        var debt = dto.ToDomain(_budgetId);

        if (debt.Strategy is not null)
            await _budgetRepository.UpdateRepaymentStrategyAsync(debt.Strategy.Value, _budgetId, ct);

        if (debt.Debts.Any())
            await _debtsRepository.AddDebtsAsync(debt.Debts, _budgetId, ct);

        return Result.Success();
    }
}
