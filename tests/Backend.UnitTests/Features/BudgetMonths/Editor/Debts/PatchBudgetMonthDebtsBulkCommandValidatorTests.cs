using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

public sealed class PatchBudgetMonthDebtsBulkCommandValidatorTests
{
    private readonly PatchBudgetMonthDebtsBulkCommandValidator _sut = new();

    private static PatchBudgetMonthDebtsBulkCommand Cmd(params PatchBudgetMonthDebtsBulkCommand.Row[] rows)
        => new(Guid.NewGuid(), "2026-01", rows);

    private static PatchBudgetMonthDebtsBulkCommand.Row Row(decimal payment = 1500m, string? scope = null)
        => new(Guid.NewGuid(), payment, scope);

    [Fact]
    public void Valid_Bulk_Passes()
    {
        _sut.TestValidate(Cmd(Row(), Row())).ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_Items_Fails()
    {
        _sut.TestValidate(Cmd()).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Duplicate_Ids_Fail()
    {
        var id = Guid.NewGuid();
        var cmd = new PatchBudgetMonthDebtsBulkCommand(
            Guid.NewGuid(),
            "2026-01",
            new[]
            {
                new PatchBudgetMonthDebtsBulkCommand.Row(id, 1m),
                new PatchBudgetMonthDebtsBulkCommand.Row(id, 2m)
            });

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Items);
    }

    [Fact]
    public void Negative_Payment_In_Row_Fails()
    {
        var cmd = Cmd(Row(-1m));
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].MonthlyPayment");
    }

    [Fact]
    public void Invalid_Scope_In_Row_Fails()
    {
        var cmd = Cmd(Row(scope: "allMonths"));
        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor("Items[0].Scope");
    }

    [Theory]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthOnly)]
    [InlineData(BudgetMonthDebtEditScopes.CurrentMonthAndBudgetPlan)]
    [InlineData(BudgetMonthDebtEditScopes.BudgetPlanOnly)]
    public void Valid_Scopes_Pass(string scope)
    {
        var cmd = Cmd(Row(scope: scope));
        _sut.TestValidate(cmd).ShouldNotHaveAnyValidationErrors();
    }
}
