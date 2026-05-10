using Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;
using Backend.Domain.Entities.Budget.Expenses;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Expense;

public sealed class PatchBudgetMonthExpenseItemsBulkCommandValidatorTests
{
    private readonly PatchBudgetMonthExpenseItemsBulkCommandValidator _sut = new();

    private static PatchBudgetMonthExpenseItemsBulkCommand.Row Row(
        Guid? id = null,
        string? name = "Netflix",
        Guid? categoryId = null,
        decimal? amount = 99.90m,
        bool? isActive = true,
        string? lifecycle = null,
        bool updateDefault = false)
        => new(
            MonthExpenseItemId: id ?? Guid.NewGuid(),
            Name: name,
            CategoryId: categoryId ?? ExpenseCategories.Subscription,
            AmountMonthly: amount,
            IsActive: isActive,
            SubscriptionLifecycleStatus: lifecycle,
            UpdateDefault: updateDefault);

    [Fact]
    public void Valid_Single_Row_Passes()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: new[] { Row() });

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Items_Fails()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: Array.Empty<PatchBudgetMonthExpenseItemsBulkCommand.Row>());

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Duplicate_Row_Ids_Fail()
    {
        var sharedId = Guid.NewGuid();
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: new[] { Row(id: sharedId), Row(id: sharedId) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Invalid_YearMonth_Fails()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026/01",
            Items: new[] { Row() });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Negative_Amount_In_Any_Row_Fails_Whole_Request()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: new[]
            {
                Row(),
                Row(amount: -1m),
            });

        var result = _sut.TestValidate(cmd);

        result.ShouldHaveValidationErrorFor("Items[1].AmountMonthly");
    }

    [Fact]
    public void Empty_Name_In_Any_Row_Fails_Whole_Request()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: new[]
            {
                Row(name: ""),
            });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].Name");
    }

    [Fact]
    public void More_Than_Two_Decimals_In_Any_Row_Fails_Whole_Request()
    {
        var cmd = new PatchBudgetMonthExpenseItemsBulkCommand(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Items: new[]
            {
                Row(amount: 10.999m),
            });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].AmountMonthly");
    }
}
