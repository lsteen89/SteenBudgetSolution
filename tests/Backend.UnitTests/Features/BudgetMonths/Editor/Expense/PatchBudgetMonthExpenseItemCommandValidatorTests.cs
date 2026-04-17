using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;
using Backend.Domain.Entities.Budget.Expenses;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Expense;

public sealed class PatchBudgetMonthExpenseItemCommandValidatorTests
{
    private readonly PatchBudgetMonthExpenseItemCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new PatchBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthExpenseItemId: Guid.NewGuid(),
            Name: "Netflix",
            CategoryId: ExpenseCategories.Subscription,
            AmountMonthly: 99.99m,
            IsActive: true,
            UpdateDefault: false);

        var result = _sut.TestValidate(cmd);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Negative_Amount_Fails()
    {
        var cmd = new PatchBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthExpenseItemId: Guid.NewGuid(),
            Name: "Netflix",
            CategoryId: ExpenseCategories.Subscription,
            AmountMonthly: -10m,
            IsActive: true,
            UpdateDefault: false);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void More_Than_2_Decimals_Fails()
    {
        var cmd = new PatchBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthExpenseItemId: Guid.NewGuid(),
            Name: "Netflix",
            CategoryId: ExpenseCategories.Subscription,
            AmountMonthly: 10.999m,
            IsActive: true,
            UpdateDefault: false);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void Empty_Name_Fails()
    {
        var cmd = new PatchBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthExpenseItemId: Guid.NewGuid(),
            Name: "",
            CategoryId: ExpenseCategories.Subscription,
            AmountMonthly: 10m,
            IsActive: true,
            UpdateDefault: false);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.Name);
    }
}