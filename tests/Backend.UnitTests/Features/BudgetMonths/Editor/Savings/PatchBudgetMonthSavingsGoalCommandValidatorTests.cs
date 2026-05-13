using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

public sealed class PatchBudgetMonthSavingsGoalCommandValidatorTests
{
    private readonly PatchBudgetMonthSavingsGoalCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m);

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.Empty,
            "2026-01",
            Guid.NewGuid(),
            1500m);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Persoid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-month")]
    [InlineData("2026-13")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            yearMonth,
            Guid.NewGuid(),
            1500m);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Negative_Contribution_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            -1m);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Zero_Contribution_Passes()
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            0m);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m,
            "allMonths");

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        var cmd = new PatchBudgetMonthSavingsGoalCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m,
            scope);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }
}
