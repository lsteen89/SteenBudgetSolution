using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

public sealed class CreateBudgetMonthSavingsGoalCommandValidatorTests
{
    private static readonly DateTime FixedUtcNow =
        new(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc);

    private static readonly DateOnly Today =
        DateOnly.FromDateTime(FixedUtcNow);

    private readonly CreateBudgetMonthSavingsGoalCommandValidator _sut =
        new(new FixedTimeProvider(FixedUtcNow));

    private static CreateBudgetMonthSavingsGoalCommand Valid(
        string? name = null,
        decimal? targetAmount = null,
        DateOnly? targetDate = null,
        decimal? amountSaved = null,
        decimal? monthlyContribution = null,
        string yearMonth = "2026-01")
        => new(
            Persoid: Guid.NewGuid(),
            YearMonth: yearMonth,
            Name: name ?? "Emergency fund",
            TargetAmount: targetAmount ?? 10000m,
            TargetDate: targetDate ?? new DateOnly(2026, 12, 31),
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
    public void TargetAmount_Above_Cap_Fails()
    {
        _sut.TestValidate(Valid(targetAmount: CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount + 0.01m))
            .ShouldHaveValidationErrorFor(x => x.TargetAmount);
    }

    [Fact]
    public void TargetAmount_At_Cap_Passes()
    {
        _sut.TestValidate(Valid(targetAmount: CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Negative_AmountSaved_Fails()
    {
        _sut.TestValidate(Valid(amountSaved: -0.01m))
            .ShouldHaveValidationErrorFor(x => x.AmountSaved);
    }

    [Fact]
    public void AmountSaved_Above_Cap_Fails()
    {
        _sut.TestValidate(Valid(
                targetAmount: CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount,
                amountSaved: CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount + 0.01m))
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

    [Fact]
    public void Null_TargetDate_Fails()
    {
        var cmd = Valid() with { TargetDate = null };
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_In_Past_Fails()
    {
        _sut.TestValidate(Valid(targetDate: Today.AddDays(-1)))
            .ShouldHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_Today_Passes()
    {
        _sut.TestValidate(Valid(targetDate: Today))
            .ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void TargetDate_Beyond_Max_Years_Fails()
    {
        var beyond = Today
            .AddYears(CreateBudgetMonthSavingsGoalCommandValidator.MaxYearsInFuture)
            .AddDays(1);

        _sut.TestValidate(Valid(targetDate: beyond))
            .ShouldHaveValidationErrorFor(x => x.TargetDate);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FixedTimeProvider(DateTime utcNow)
        {
            _now = new DateTimeOffset(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc));
        }

        public override DateTimeOffset GetUtcNow() => _now;
    }
}
