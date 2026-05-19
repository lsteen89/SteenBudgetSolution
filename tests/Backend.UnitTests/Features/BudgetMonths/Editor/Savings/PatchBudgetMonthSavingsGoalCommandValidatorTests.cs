using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

public sealed class PatchBudgetMonthSavingsGoalCommandValidatorTests
{
    private static readonly DateTime FixedUtcNow =
        new(2026, 01, 07, 08, 00, 00, DateTimeKind.Utc);

    private static readonly DateOnly Today =
        DateOnly.FromDateTime(FixedUtcNow);

    private readonly PatchBudgetMonthSavingsGoalCommandValidator _sut =
        new(new FixedTimeProvider(FixedUtcNow));

    private static PatchBudgetMonthSavingsGoalCommand Build(
        decimal contribution = 1500m,
        DateOnly? targetDate = null,
        string? scope = null,
        string yearMonth = "2026-01",
        Guid? persoid = null,
        Guid? monthGoalId = null)
        => new(
            Persoid: persoid ?? Guid.NewGuid(),
            YearMonth: yearMonth,
            MonthSavingsGoalId: monthGoalId ?? Guid.NewGuid(),
            MonthlyContribution: contribution,
            TargetDate: targetDate,
            Scope: scope);

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
    public void Negative_Contribution_Fails()
    {
        _sut.TestValidate(Build(contribution: -1m))
            .ShouldHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Zero_Contribution_Passes()
    {
        _sut.TestValidate(Build(contribution: 0m))
            .ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Invalid_Scope_Fails()
    {
        _sut.TestValidate(Build(scope: "allMonths"))
            .ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_Passes(string? scope)
    {
        _sut.TestValidate(Build(scope: scope))
            .ShouldNotHaveValidationErrorFor(x => x.Scope);
    }

    [Theory]
    [InlineData("1234.5")]
    [InlineData("1234.56")]
    [InlineData("0.01")]
    public void Decimal_Contribution_Within_Two_Places_Passes(string raw)
    {
        _sut.TestValidate(Build(
                contribution: decimal.Parse(raw, System.Globalization.CultureInfo.InvariantCulture)))
            .ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Contribution_With_More_Than_Two_Decimals_Fails()
    {
        _sut.TestValidate(Build(contribution: 1234.567m))
            .ShouldHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Contribution_Above_Cap_Fails()
    {
        _sut.TestValidate(Build(
                contribution: PatchBudgetMonthSavingsGoalCommandValidator.MaxAmount + 0.01m))
            .ShouldHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Contribution_At_Cap_Passes()
    {
        _sut.TestValidate(Build(
                contribution: PatchBudgetMonthSavingsGoalCommandValidator.MaxAmount))
            .ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution);
    }

    [Fact]
    public void Null_TargetDate_Passes_Because_TargetDate_Is_Optional_On_Patch()
    {
        _sut.TestValidate(Build(targetDate: null))
            .ShouldNotHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_In_Past_Fails()
    {
        _sut.TestValidate(Build(targetDate: Today.AddDays(-1)))
            .ShouldHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_Today_Passes()
    {
        _sut.TestValidate(Build(targetDate: Today))
            .ShouldNotHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_Within_Cap_Passes()
    {
        _sut.TestValidate(Build(targetDate: Today.AddYears(5)))
            .ShouldNotHaveValidationErrorFor(x => x.TargetDate);
    }

    [Fact]
    public void TargetDate_Beyond_Max_Years_Fails()
    {
        var beyond = Today
            .AddYears(PatchBudgetMonthSavingsGoalCommandValidator.MaxYearsInFuture)
            .AddDays(1);

        _sut.TestValidate(Build(targetDate: beyond))
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
