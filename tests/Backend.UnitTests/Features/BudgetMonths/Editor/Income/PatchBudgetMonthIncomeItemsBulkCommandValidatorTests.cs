using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Income;

public sealed class PatchBudgetMonthIncomeItemsBulkCommandValidatorTests
{
    private readonly PatchBudgetMonthIncomeItemsBulkCommandValidator _sut = new();

    private static PatchBudgetMonthIncomeItemsBulkCommand.Row Row(
        Guid? id = null,
        string? name = "Consulting",
        decimal? amount = 1200m,
        bool? isActive = true,
        string? scope = null)
        => new(
            MonthIncomeItemId: id ?? Guid.NewGuid(),
            Name: name,
            AmountMonthly: amount,
            IsActive: isActive,
            UpdateDefault: false,
            Scope: scope);

    [Fact]
    public void Valid_Single_Row_Passes()
    {
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row() });

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Items_Fails()
    {
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            Array.Empty<PatchBudgetMonthIncomeItemsBulkCommand.Row>());

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Duplicate_Row_Ids_Fail()
    {
        var id = Guid.NewGuid();
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(id), Row(id) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Negative_Amount_In_Any_Row_Fails()
    {
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(), Row(amount: -1m) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[1].AmountMonthly");
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(scope: "allMonths") });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].Scope");
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthIncomeEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthIncomeEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        var cmd = new PatchBudgetMonthIncomeItemsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(scope: scope) });

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor("Items[0].Scope");
    }
}

