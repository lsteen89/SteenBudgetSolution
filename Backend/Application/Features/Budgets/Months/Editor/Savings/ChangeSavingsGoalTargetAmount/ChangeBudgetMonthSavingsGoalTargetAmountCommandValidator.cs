using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.ChangeSavingsGoalTargetAmount;

public sealed class ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator
    : AbstractValidator<ChangeBudgetMonthSavingsGoalTargetAmountCommand>
{
    public const decimal MaxTargetAmount = 10_000_000m;

    public ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthSavingsGoalId)
            .NotEmpty();

        RuleFor(x => x.TargetAmount)
            .Cascade(CascadeMode.Stop)
            .GreaterThan(0m).WithMessage("TargetAmount must be greater than zero.")
            .LessThanOrEqualTo(MaxTargetAmount)
                .WithMessage($"TargetAmount must be {MaxTargetAmount:0} or less.")
            .PrecisionScale(12, 2, false)
                .WithMessage("TargetAmount must have at most 2 decimal places.");
    }
}
