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
    public RepaymentStrategy RepaymentStrategy { get; private set; } = RepaymentStrategy.Unknown;

    public decimal CarryOverAmountMonthly { get; private set; } = 0m;

    public Task<Result> ApplyIncomeAsync(IncomeData dto, CancellationToken ct)
    {
        Income = dto.ToDomain(BudgetId);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplyExpenditureAsync(ExpenditureData dto, CancellationToken ct)
    {
        Expense ??= new Expense { BudgetId = BudgetId };

        // 1) This substep "owns" these categories, so we must wipe them first
        var ownedCategories = Expense.GetOwnedExpenseCategories(dto);
        Expense.RemoveItemsInCategories(ownedCategories);

        // 2) Add drafts (only amounts > 0 will be added)
        var drafts = dto.ToExpenseItemDrafts();
        foreach (var d in drafts)
            Expense.AddItem(d.CategoryId, d.Name, d.AmountMonthly);

        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplySavingsAsync(SavingsData dto, CancellationToken ct)
    {
        Savings ??= new Savings { BudgetId = BudgetId };

        Savings.ApplyPatchFrom(dto);

        return Task.FromResult(Result.Success());
    }

    public Task<Result> ApplyDebtAsync(DebtData dto, CancellationToken ct)
    {
        // Only overwrite debts when this payload actually contains debts
        if (dto.Debts is not null)
        {
            var res = dto.ToDomain(BudgetId);
            Debts = res.Debts;
        }

        // Only overwrite strategy when present
        RepaymentStrategy = dto.Summary?.RepaymentStrategy ?? RepaymentStrategy.Unknown;

        return Task.FromResult(Result.Success());
    }
}
