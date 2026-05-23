using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchBaseSavings;

// Mirrors the savings-goal patch validator. Reuses `MaxAmount` from the goal
// validator so a single number bound governs every savings input the user can
// type — keeps the surface predictable and the upper bound easy to audit.
public sealed class PatchBudgetMonthBaseSavingsCommandValidator
    : AbstractValidator<PatchBudgetMonthBaseSavingsCommand>
{
    public const decimal MaxAmount = CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount;

    public PatchBudgetMonthBaseSavingsCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.AmountMonthly)
            .GreaterThanOrEqualTo(0m)
            .LessThanOrEqualTo(MaxAmount)
            .PrecisionScale(12, 2, false);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthBaseSavingsEditScopes.IsSupported)
            .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
    }
}
