using Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

/// <summary>
/// PR-06 validator surface. The "new target must not fall below the amount
/// already saved" rule is *not* tested here — it lives in the handler
/// because it depends on the loaded row.
/// </summary>
public sealed class ChangeBudgetMonthSavingsGoalTargetAmountCommandValidatorTests
{
    private readonly ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator _sut = new();

    private static ChangeBudgetMonthSavingsGoalTargetAmountCommand Build(
        decimal targetAmount = 50_000m,
        string yearMonth = "2026-01",
        Guid? persoid = null,
        Guid? monthGoalId = null)
        => new(
            Persoid: persoid ?? Guid.NewGuid(),
            YearMonth: yearMonth,
            MonthSavingsGoalId: monthGoalId ?? Guid.NewGuid(),
            TargetAmount: targetAmount);

    [Fact]
    public void Valid_Command_Passes()
    {
        _sut.TestValidate(Build()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        _sut.TestValidate(Build(persoid: Guid.Empty))
            .ShouldHaveValidationErrorFor(x => x.Persoid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-month")]
    [InlineData("2026-13")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        _sut.TestValidate(Build(yearMonth: yearMonth))
            .ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Empty_MonthGoalId_Fails()
    {
        _sut.TestValidate(Build(monthGoalId: Guid.Empty))
            .ShouldHaveValidationErrorFor(x => x.MonthSavingsGoalId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public void Non_Positive_TargetAmount_Fails(decimal value)
    {
        _sut.TestValidate(Build(targetAmount: value))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_At_Max_Passes()
    {
        _sut.TestValidate(Build(
                targetAmount: ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator.MaxTargetAmount))
            .ShouldNotHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_Above_Max_Fails()
    {
        _sut.TestValidate(Build(
                targetAmount: ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator.MaxTargetAmount + 0.01m))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_Three_Decimals_Fails()
    {
        _sut.TestValidate(Build(targetAmount: 1234.567m))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_Two_Decimals_Passes()
    {
        _sut.TestValidate(Build(targetAmount: 1234.56m))
            .ShouldNotHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_Whole_Number_Passes()
    {
        _sut.TestValidate(Build(targetAmount: 1234m))
            .ShouldNotHaveValidationErrorFor(x => x.TargetAmount);
    }
}
