using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;

public sealed class PatchBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<PatchBudgetMonthSavingsGoalCommand>
{
    public PatchBudgetMonthSavingsGoalCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthSavingsGoalId)
            .NotEmpty();

        RuleFor(x => x.MonthlyContribution)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthSavingsGoalEditScopes.IsSupported)
            .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
    }
}
