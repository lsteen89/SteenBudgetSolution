using Backend.Application.DTO.Budget.Debt;
using Backend.Application.DTO.Budget.Expenditure;
using Backend.Application.DTO.Budget.Income;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Materialize;

public abstract class WizardBudgetMaterializer
{
    protected readonly Guid BudgetId;

    protected WizardBudgetMaterializer(Guid budgetId) => BudgetId = budgetId;

    public Task<Result> ApplyIncomeAsync(IncomeData dto, CancellationToken ct)
        => OnIncomeAsync(dto.ToDomain(BudgetId), ct);

    public Task<Result> ApplyExpenditureAsync(ExpenditureData dto, CancellationToken ct)
        => OnExpenditureAsync(dto.ToUnifiedExpense(BudgetId), ct);

    public Task<Result> ApplySavingsAsync(SavingsData dto, CancellationToken ct)
        => OnSavingsAsync(dto.ToDomain(BudgetId), ct);

    public Task<Result> ApplyDebtAsync(DebtData dto, CancellationToken ct)
        => OnDebtAsync(dto.ToDomain(BudgetId), ct);

    // The only variation: what you do with the mapped domain objects
    protected abstract Task<Result> OnIncomeAsync(Backend.Domain.Entities.Budget.Income.Income income, CancellationToken ct);
    protected abstract Task<Result> OnExpenditureAsync(Backend.Domain.Entities.Budget.Expenses.Expense expense, CancellationToken ct);
    protected abstract Task<Result> OnSavingsAsync(Backend.Domain.Entities.Budget.Savings.Savings savings, CancellationToken ct);
    protected abstract Task<Result> OnDebtAsync(Backend.Domain.Entities.Wizard.WizardDebtResult debt, CancellationToken ct);
}
