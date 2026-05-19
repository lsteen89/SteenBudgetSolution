using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.PatchSavingsGoal;

public sealed class PatchBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<PatchBudgetMonthSavingsGoalCommand>
{
    public const decimal MaxAmount = CreateBudgetMonthSavingsGoalCommandValidator.MaxAmount;
    public const int MaxYearsInFuture = CreateBudgetMonthSavingsGoalCommandValidator.MaxYearsInFuture;

    private readonly TimeProvider _timeProvider;

    public PatchBudgetMonthSavingsGoalCommandValidator(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;

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
            .LessThanOrEqualTo(MaxAmount)
            .PrecisionScale(12, 2, false);

        // Target date is optional on patch. When provided, mirror create rules:
        // not in the past, not more than 40 years ahead.
        RuleFor(x => x.TargetDate)
            .Cascade(CascadeMode.Stop)
            .Must(d => d!.Value >= TodayLocal())
                .WithMessage("TargetDate cannot be in the past.")
            .Must(d => d!.Value <= TodayLocal().AddYears(MaxYearsInFuture))
                .WithMessage($"TargetDate cannot be more than {MaxYearsInFuture} years in the future.")
            .When(x => x.TargetDate.HasValue);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthSavingsGoalEditScopes.IsSupported)
            .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
    }

    private DateOnly TodayLocal()
        => DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
}
