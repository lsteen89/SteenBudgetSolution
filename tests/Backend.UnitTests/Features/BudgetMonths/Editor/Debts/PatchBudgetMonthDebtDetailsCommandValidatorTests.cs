using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

public sealed class PatchBudgetMonthDebtDetailsCommandValidatorTests
{
    private readonly PatchBudgetMonthDebtDetailsCommandValidator _sut = new();

    private static PatchBudgetMonthDebtDetailsCommand ValidPrivate(string? scope = null) =>
        new(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthDebtId: Guid.NewGuid(),
            Name: "Privatlån",
            Type: DebtTypes.Private,
            Apr: 6.4m,
            MonthlyFee: 0m,
            MinPayment: 1100m,
            TermMonths: 28,
            MonthlyPayment: 1500m,
            Scope: scope);

    [Fact]
    public void Valid_Private_Command_Passes()
    {
        _sut.TestValidate(ValidPrivate()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = ValidPrivate() with { Persoid = Guid.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Persoid);
    }

    [Fact]
    public void Empty_MonthDebtId_Fails()
    {
        var cmd = ValidPrivate() with { MonthDebtId = Guid.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthDebtId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026-13")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        var cmd = ValidPrivate() with { YearMonth = yearMonth };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Empty_Name_Fails()
    {
        var cmd = ValidPrivate() with { Name = string.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Invalid_Type_Fails()
    {
        var cmd = ValidPrivate() with { Type = "unknown" };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Type);
    }

    [Fact]
    public void Negative_Apr_Fails()
    {
        var cmd = ValidPrivate() with { Apr = -0.01m };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Apr);
    }

    [Fact]
    public void Negative_MonthlyPayment_Fails()
    {
        var cmd = ValidPrivate() with { MonthlyPayment = -1m };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthlyPayment);
    }

    [Fact]
    public void Revolving_Without_MinPayment_Fails()
    {
        var cmd = ValidPrivate() with
        {
            Type = DebtTypes.Revolving,
            MinPayment = null,
            TermMonths = null
        };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MinPayment);
    }

    [Fact]
    public void Installment_Without_TermMonths_Fails()
    {
        var cmd = ValidPrivate() with
        {
            Type = DebtTypes.Installment,
            TermMonths = null
        };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.TermMonths);
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        var cmd = ValidPrivate(scope: "allMonths");
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthDebtEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        var cmd = ValidPrivate(scope: scope);
        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }
}
