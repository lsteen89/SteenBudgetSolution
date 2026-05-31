using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.CreateDebt;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

public sealed class CreateBudgetMonthDebtCommandValidatorTests
{
    private readonly CreateBudgetMonthDebtCommandValidator _sut = new();

    private static CreateBudgetMonthDebtCommand ValidPrivate(string? scope = null) =>
        new(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            Name: "Privatlån",
            Type: DebtTypes.Private,
            Balance: 38500m,
            Apr: 6.4m,
            MonthlyFee: 0m,
            MinPayment: 1100m,
            TermMonths: 28,
            MonthlyPayment: 1200m,
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

    [Theory]
    [InlineData("")]
    [InlineData("not-a-month")]
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
    public void Name_Over_255_Fails()
    {
        var cmd = ValidPrivate() with { Name = new string('A', 256) };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Theory]
    [InlineData("unknown-type")]
    [InlineData("")]
    public void Invalid_Type_Fails(string type)
    {
        var cmd = ValidPrivate() with { Type = type };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Type);
    }

    [Fact]
    public void Negative_Balance_Fails()
    {
        var cmd = ValidPrivate() with { Balance = -1m };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Balance);
    }

    [Fact]
    public void Zero_Balance_Passes()
    {
        var cmd = ValidPrivate() with { Balance = 0m };
        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Balance);
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
    public void Revolving_With_MinPayment_Below_One_Fails()
    {
        var cmd = ValidPrivate() with
        {
            Type = DebtTypes.Revolving,
            MinPayment = 0m,
            TermMonths = null
        };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MinPayment);
    }

    [Fact]
    public void Revolving_With_MinPayment_Atleast_One_Passes()
    {
        var cmd = ValidPrivate() with
        {
            Type = DebtTypes.Revolving,
            MinPayment = 600m,
            TermMonths = null
        };
        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.MinPayment);
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
    public void BankLoan_Without_TermMonths_Fails()
    {
        var cmd = ValidPrivate() with
        {
            Type = DebtTypes.BankLoan,
            TermMonths = null
        };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.TermMonths);
    }

    [Fact]
    public void TermMonths_Below_One_Fails()
    {
        var cmd = ValidPrivate() with { TermMonths = 0 };
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
