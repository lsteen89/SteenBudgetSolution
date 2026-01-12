using Backend.Application.DTO.Budget.Debt;
using Backend.Application.DTO.Budget.Expenditure;
using Backend.Application.DTO.Budget.Income;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;
using Backend.Domain.Entities.Budget.Debt;
using Backend.Domain.Entities.Budget.Expenses;
using Backend.Domain.Entities.Budget.Income;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;

namespace Backend.Application.Features.Wizard.FinalizationPreview.Models;

public sealed class PreviewBudgetTarget
    : IWizardFinalizationTarget, IIncomeTarget, IExpenditureTarget, ISavingsTarget, IDebtTarget
{
    public Guid BudgetId { get; } = Guid.Empty;

    public Income? Income { get; private set; }
    public Expense? Expense { get; private set; }
    public Savings? Savings { get; private set; }

    public IReadOnlyList<Debt> Debts { get; private set; } = Array.Empty<Debt>();
    public string? RepaymentStrategy { get; private set; }

    public decimal CarryOverAmountMonthly { get; private set; } = 0m;

    public Task<Result> ApplyIncomeAsync(IncomeData dto, CancellationToken ct)
    {
        Income = dto.ToDomain(BudgetId);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplyExpenditureAsync(ExpenditureData dto, CancellationToken ct)
    {
        Expense = dto.ToUnifiedExpense(BudgetId);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplySavingsAsync(SavingsData dto, CancellationToken ct)
    {
        Savings = dto.ToDomain(BudgetId);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplyDebtAsync(DebtData dto, CancellationToken ct)
    {
        var res = dto.ToDomain(BudgetId);
        Debts = res.Debts;
        RepaymentStrategy = res.Strategy?.Value;
        return Task.FromResult(Result.Success());
    }
}
