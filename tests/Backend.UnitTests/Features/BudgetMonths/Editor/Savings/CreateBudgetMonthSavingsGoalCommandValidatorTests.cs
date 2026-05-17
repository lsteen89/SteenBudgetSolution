using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

public sealed class CreateBudgetMonthSavingsGoalCommandValidatorTests
{
    private readonly CreateBudgetMonthSavingsGoalCommandValidator _sut = new();

    private static CreateBudgetMonthSavingsGoalCommand Valid(
        string? name = null,
        decimal? targetAmount = null,
        decimal? amountSaved = null,
        decimal? monthlyContribution = null,
        string yearMonth = "2026-01")
        => new(
            Persoid: Guid.NewGuid(),
            YearMonth: yearMonth,
            Name: name ?? "Emergency fund",
            TargetAmount: targetAmount ?? 10000m,
            TargetDate: new DateOnly(2026, 12, 31),
            AmountSaved: amountSaved,
            MonthlyContribution: monthlyContribution ?? 500m);

    [Fact]
    public void Valid_Command_Passes()
    {
        _sut.TestValidate(Valid()).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Valid_Command_With_Null_AmountSaved_Passes()
    {
        _sut.TestValidate(Valid(amountSaved: null)).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Invalid_YearMonth_Fails()
    {
        _sut.TestValidate(Valid(yearMonth: "2026-13"))
            .ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Empty_Name_Fails()
    {
        _sut.TestValidate(Valid(name: ""))
            .ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Too_Long_Name_Fails()
    {
        _sut.TestValidate(Valid(name: new string('x', 256)))
            .ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Zero_TargetAmount_Fails()
    {
        _sut.TestValidate(Valid(targetAmount: 0m))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void Negative_TargetAmount_Fails()
    {
        _sut.TestValidate(Valid(targetAmount: -1m))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void Negative_AmountSaved_Fails()
    {
        _sut.TestValidate(Valid(amountSaved: -0.01m))
            .ShouldHaveValidationErrorFor(x => x.AmountSaved);
    }

    [Fact]
    public void AmountSaved_Exceeding_TargetAmount_Fails()
    {
        _sut.TestValidate(Valid(targetAmount: 1000m, amountSaved: 1500m))
            .ShouldHaveValidationErrorFor(nameof(CreateBudgetMonthSavingsGoalCommand.AmountSaved));
    }

    [Fact]
    public void AmountSaved_Equal_To_TargetAmount_Passes()
    {
        _sut.TestValidate(Valid(targetAmount: 1000m, amountSaved: 1000m))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Negative_MonthlyContribution_Fails()
    {
        _sut.TestValidate(Valid(monthlyContribution: -1m))
            .ShouldHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Zero_MonthlyContribution_Passes()
    {
        _sut.TestValidate(Valid(monthlyContribution: 0m))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = Valid() with { Persoid = Guid.Empty };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Persoid);
    }
}
