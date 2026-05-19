using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoalsBulk;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Savings;

public sealed class PatchBudgetMonthSavingsGoalsBulkCommandValidatorTests
{
    private readonly PatchBudgetMonthSavingsGoalsBulkCommandValidator _sut = new();

    private static PatchBudgetMonthSavingsGoalsBulkCommand.Row Row(
        Guid? id = null,
        decimal amount = 1500m,
        string? scope = null)
        => new(
            MonthSavingsGoalId: id ?? Guid.NewGuid(),
            MonthlyContribution: amount,
            Scope: scope);

    [Fact]
    public void Valid_Single_Row_Passes()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row() });

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Items_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            Array.Empty<PatchBudgetMonthSavingsGoalsBulkCommand.Row>());

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Duplicate_Row_Ids_Fail()
    {
        var id = Guid.NewGuid();
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(id), Row(id) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Negative_Amount_In_Any_Row_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(), Row(amount: -1m) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[1].MonthlyContribution");
    }

    [Fact]
    public void Invalid_Scope_In_Row_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(scope: "allMonths") });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].Scope");
    }

    [Theory]
    [InlineData(null)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthSavingsGoalEditScopes.BudgetPlanOnly)]
    public void Valid_Scope_In_Row_Passes(string? scope)
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(scope: scope) });

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor("Items[0].Scope");
    }

    [Fact]
    public void Row_With_Decimal_Within_Two_Places_Passes()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(amount: 1234.56m) });

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor("Items[0].MonthlyContribution");
    }

    [Fact]
    public void Row_With_More_Than_Two_Decimals_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[] { Row(amount: 1234.567m) });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].MonthlyContribution");
    }

    [Fact]
    public void Row_Amount_Above_Cap_Fails()
    {
        var cmd = new PatchBudgetMonthSavingsGoalsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[]
            {
                Row(amount:
                    Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal
                        .CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount + 0.01m)
            });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].MonthlyContribution");
    }
}
