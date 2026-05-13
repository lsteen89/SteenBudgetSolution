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
}

