using Backend.Application.Features.Budgets.Months.Editor.Income.DeleteIncomeItem;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Income;

public sealed class DeleteBudgetMonthIncomeItemCommandValidatorTests
{
    private readonly DeleteBudgetMonthIncomeItemCommandValidator _sut = new();

    [Fact]
    public void Valid_Command_Passes()
    {
        var cmd = new DeleteBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.NewGuid());

        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Id_Fails()
    {
        var cmd = new DeleteBudgetMonthIncomeItemCommand(
            Guid.NewGuid(),
            "2026-01",
            Guid.Empty);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.MonthIncomeItemId);
    }
}
