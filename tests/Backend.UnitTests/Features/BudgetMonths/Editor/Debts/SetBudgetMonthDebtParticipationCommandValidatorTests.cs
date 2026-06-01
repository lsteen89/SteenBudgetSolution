using Backend.Application.Constants;
using Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;
using FluentValidation.TestHelper;

namespace Backend.UnitTests.Features.BudgetMonths.Editor.Debts;

// Debt PR 4. Mirrors the planned-payment / balance validator test layout so
// the rules covered here stay obvious to future readers — the whitelist on
// `Participation` is what makes `removed` unreachable through this command.
public sealed class SetBudgetMonthDebtParticipationCommandValidatorTests
{
    private readonly SetBudgetMonthDebtParticipationCommandValidator _sut = new();

    [Theory]
    [InlineData(BudgetMonthDebtParticipationStatuses.Included)]
    [InlineData(BudgetMonthDebtParticipationStatuses.NotIncluded)]
    public void Whitelisted_Participation_Passes(string participation)
    {
        var cmd = new SetBudgetMonthDebtParticipationCommand(
            Guid.NewGuid(), "2026-01", Guid.NewGuid(), participation, Note: null);

        _sut.TestValidate(cmd).ShouldNotHaveValidationErrorFor(x => x.Participation);
    }

    [Theory]
    [InlineData(BudgetMonthDebtParticipationStatuses.Removed)] // explicit remove command only
    [InlineData("")]
    [InlineData("active")]
    [InlineData("paidOff")]
    public void NonWhitelisted_Participation_Fails(string participation)
    {
        var cmd = new SetBudgetMonthDebtParticipationCommand(
            Guid.NewGuid(), "2026-01", Guid.NewGuid(), participation, Note: null);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Participation);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-month")]
    [InlineData("2026-13")]
    public void Invalid_YearMonth_Fails(string yearMonth)
    {
        var cmd = new SetBudgetMonthDebtParticipationCommand(
            Guid.NewGuid(), yearMonth, Guid.NewGuid(),
            BudgetMonthDebtParticipationStatuses.NotIncluded, null);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.YearMonth);
    }

    [Fact]
    public void Note_Over_255_Chars_Fails()
    {
        var cmd = new SetBudgetMonthDebtParticipationCommand(
            Guid.NewGuid(), "2026-01", Guid.NewGuid(),
            BudgetMonthDebtParticipationStatuses.NotIncluded,
            Note: new string('x', 256));

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Note);
    }

    [Fact]
    public void Empty_Persoid_Fails()
    {
        var cmd = new SetBudgetMonthDebtParticipationCommand(
            Guid.Empty, "2026-01", Guid.NewGuid(),
            BudgetMonthDebtParticipationStatuses.NotIncluded, null);

        _sut.TestValidate(cmd).ShouldHaveValidationErrorFor(x => x.Persoid);
    }
}
