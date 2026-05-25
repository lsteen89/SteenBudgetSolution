using Backend.Application.Features.Budgets.Months.Editor.Savings.RenameSavingsGoal;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

/// <summary>
/// PR-05 validator surface. Same shape as
/// <c>PatchBudgetMonthSavingsGoalCommandValidatorTests</c> — the rename
/// surface only carries Persoid / YearMonth / MonthSavingsGoalId / Name, so
/// boundaries are limited to those four fields.
/// </summary>
public sealed class RenameBudgetMonthSavingsGoalCommandValidatorTests
{
    private readonly RenameBudgetMonthSavingsGoalCommandValidator _sut = new();

    private static RenameBudgetMonthSavingsGoalCommand Build(
        string name = "Buffert",
        string yearMonth = "2026-01",
        Guid? persoid = null,
        Guid? monthGoalId = null)
        => new(
            Persoid: persoid ?? Guid.NewGuid(),
            YearMonth: yearMonth,
            MonthSavingsGoalId: monthGoalId ?? Guid.NewGuid(),
            Name: name);

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
    [InlineData("")]
    [InlineData("   ")]
    public void Empty_Or_Whitespace_Name_Fails(string name)
    {
        _sut.TestValidate(Build(name: name))
            .ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_At_Max_Length_Passes()
    {
        var name = new string('a', 255);
        _sut.TestValidate(Build(name: name))
            .ShouldNotHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_Above_Max_Length_Fails()
    {
        var name = new string('a', 256);
        _sut.TestValidate(Build(name: name))
            .ShouldHaveValidationErrorFor(x => x.Name);
    }
}
