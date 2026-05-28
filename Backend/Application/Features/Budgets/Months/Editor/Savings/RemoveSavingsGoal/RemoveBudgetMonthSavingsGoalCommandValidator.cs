using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsGoal;

public sealed class RemoveBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<RemoveBudgetMonthSavingsGoalCommand>
{
    public RemoveBudgetMonthSavingsGoalCommandValidator()
    {
        RuleFor(x => x.Persoid).NotEmpty();
        RuleFor(x => x.MonthSavingsGoalId).NotEmpty();
        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");
    }
}
