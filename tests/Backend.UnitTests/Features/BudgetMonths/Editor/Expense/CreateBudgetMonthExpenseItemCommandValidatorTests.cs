using Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;
using Backend.Domain.Entities.Budget.Expenses;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Expense;

public sealed class CreateBudgetMonthExpenseItemCommandValidatorTests
{
    private readonly CreateBudgetMonthExpenseItemCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new CreateBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            CategoryId: ExpenseCategories.Other,
            Name: "Groceries",
            AmountMonthly: 123.45m,
            IsActive: true);

        var result = _sut.TestValidate(cmd);

        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Name_Fails()
    {
        var cmd = new CreateBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            CategoryId: ExpenseCategories.Other,
            Name: "",
            AmountMonthly: 123.45m,
            IsActive: true);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Negative_Amount_Fails()
    {
        var cmd = new CreateBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            CategoryId: ExpenseCategories.Other,
            Name: "Groceries",
            AmountMonthly: -1m,
            IsActive: true);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void More_Than_2_Decimals_Fails()
    {
        var cmd = new CreateBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            CategoryId: ExpenseCategories.Other,
            Name: "Groceries",
            AmountMonthly: 12.345m,
            IsActive: true);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void Invalid_YearMonth_Fails()
    {
        var cmd = new CreateBudgetMonthExpenseItemCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-13",
            CategoryId: ExpenseCategories.Other,
            Name: "Groceries",
            AmountMonthly: 12m,
            IsActive: true);

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor(x => x.YearMonth);
    }
}