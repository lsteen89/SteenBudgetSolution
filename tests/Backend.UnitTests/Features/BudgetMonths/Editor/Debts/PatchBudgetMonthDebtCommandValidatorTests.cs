using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

public sealed class PatchBudgetMonthDebtCommandValidatorTests
{
    private readonly PatchBudgetMonthDebtCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m);

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = new PatchBudgetMonthDebtCommand(
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
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            yearMonth,
            Guid.NewGuid(),
            1500m);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Negative_Payment_Fails()
    {
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            -1m);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthlyPayment);
    }

    [Fact]
    public void Zero_Payment_Passes()
    {
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            0m);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.MonthlyPayment);
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m,
            "allMonths");

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthDebtEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        var cmd = new PatchBudgetMonthDebtCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid(),
            1500m,
            scope);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }
}
