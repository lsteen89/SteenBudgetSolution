using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

public sealed class AdjustBudgetMonthDebtBalanceCommandValidatorTests
{
    private readonly AdjustBudgetMonthDebtBalanceCommandValidator _sut = new();

    private static AdjustBudgetMonthDebtBalanceCommand Valid(
        decimal newBalance = 38500m,
        string? scope = null,
        string? note = null) =>
        new(
            Persoid: Guid.NewGuid(),
            YearMonth: "2026-01",
            MonthDebtId: Guid.NewGuid(),
            NewBalance: newBalance,
            Scope: scope,
            Note: note);

    [Fact]
    public void Valid_Command_Passes()
    {
        _sut.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = Valid() with { Persoid = Guid.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Persoid);
    }

    [Fact]
    public void Empty_MonthDebtId_Fails()
    {
        var cmd = Valid() with { MonthDebtId = Guid.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthDebtId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("2026-13")]
    [InlineData("not-a-year")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        var cmd = Valid() with { YearMonth = yearMonth };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Negative_NewBalance_Fails()
    {
        var cmd = Valid(newBalance: -0.01m);
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.NewBalance);
    }

    [Fact]
    public void Zero_NewBalance_Is_Allowed()
    {
        // Balance to zero is a legitimate correction (e.g. the lender shows
        // the loan as cleared). It must NOT auto-flip the source lifecycle
        // — that's PR 4's mark-paid-off command — but it must validate.
        _sut.TestValidate(Valid(newBalance: 0m)).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthDebtEditScopes.BudgetPlanOnly)]
    [InlineData(null)]
    public void Supported_Scope_Passes(string? scope)
    {
        _sut.TestValidate(Valid(scope: scope)).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Unsupported_Scope_Fails()
    {
        var cmd = Valid(scope: "futureMonthOnly");
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Fact]
    public void Note_TooLong_Fails()
    {
        var cmd = Valid(note: new string('a', 501));
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Note);
    }

    [Fact]
    public void Note_AtCap_Passes()
    {
        var cmd = Valid(note: new string('a', 500));
        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Null_Note_Passes()
    {
        _sut.TestValidate(Valid(note: null)).ShouldNotHaveAnyValidationErrors();
    }
}
