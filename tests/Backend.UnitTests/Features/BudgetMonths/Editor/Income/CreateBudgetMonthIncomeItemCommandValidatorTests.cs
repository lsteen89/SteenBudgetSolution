using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Income;

public sealed class CreateBudgetMonthIncomeItemCommandValidatorTests
{
    private readonly CreateBudgetMonthIncomeItemCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true);

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Salary_Create_Kind_Fails()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.Salary,
            "Salary",
            1500m,
            true);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Kind);
    }

    [Fact]
    public void Empty_Name_Fails()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "",
            1500m,
            true);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Negative_Amount_Fails()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            -1m,
            true);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.AmountMonthly);
    }

    [Fact]
    public void Invalid_YearMonth_Fails()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-13",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Null_Scope_Passes_AndIsTreatedAsMonthOnly_ByHandler()
    {
        // Null is allowed at the validator level; the handler resolves it
        // to `currentMonthOnly` so older clients keep their existing
        // behavior without sending the new field.
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true,
            Scope: null);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }

    [Fact]
    public void CurrentMonthOnly_Scope_Passes()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true,
            Scope: BudgetMonthIncomeEditScopes.CurrentMonthOnly);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }

    [Fact]
    public void CurrentMonthAndBudgetPlan_Scope_Passes()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.HouseholdMember,
            "Partner contribution",
            500m,
            true,
            Scope: BudgetMonthIncomeEditScopes.CurrentMonthAndBudgetPlan);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Scope);
    }

    [Fact]
    public void BudgetPlanOnly_Scope_Fails_OnCreate()
    {
        // `budgetPlanOnly` is intentionally not a create scope: creating a
        // plan row without touching the current month is a future-plan flow
        // the income editor deliberately does not expose. Edit still
        // supports it (see PatchBudgetMonthIncomeItemCommandValidator).
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true,
            Scope: BudgetMonthIncomeEditScopes.BudgetPlanOnly);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }

    [Fact]
    public void Garbage_Scope_Fails()
    {
        var cmd = new CreateBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            BudgetMonthIncomeItemKinds.SideHustle,
            "Consulting",
            1500m,
            true,
            Scope: "neitherThisNorThat");

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Scope);
    }
}

