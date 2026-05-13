using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Income;

public sealed class PatchBudgetMonthIncomeItemCommandValidatorTests
{
    private readonly PatchBudgetMonthIncomeItemCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new PatchBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            "Consulting",
            1500m,
            true,
            false);

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Negative_Amount_Fails()
    {
        var cmd = new PatchBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            "Consulting",
            -1m,
            true,
            false);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        var cmd = new PatchBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            "Consulting",
            1500m,
            true,
            false,
            "allMonths");

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthIncomeEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthIncomeEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        var cmd = new PatchBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            "Consulting",
            1500m,
            true,
            false,
            scope);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }
}

