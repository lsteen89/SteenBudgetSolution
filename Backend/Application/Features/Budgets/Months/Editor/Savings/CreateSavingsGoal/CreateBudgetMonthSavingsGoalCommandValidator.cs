using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;

public sealed class CreateBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<CreateBudgetMonthSavingsGoalCommand>
{
    public const decimal MaxAmount = 100_000_000m;
    public const int MaxYearsInFuture = 40;

    private readonly TimeProvider _timeProvider;

    public CreateBudgetMonthSavingsGoalCommandValidator(TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;

        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(255);

        RuleFor(x => x.TargetAmount)
            .GreaterThan(0m)
            .LessThanOrEqualTo(MaxAmount)
            .PrecisionScale(12, 2, false);

        RuleFor(x => x.TargetDate)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("TargetDate is required.")
            .Must(d => d!.Value >= TodayLocal())
                .WithMessage("TargetDate cannot be in the past.")
            .Must(d => d!.Value <= TodayLocal().AddYears(MaxYearsInFuture))
                .WithMessage($"TargetDate cannot be more than {MaxYearsInFuture} years in the future.");

        RuleFor(x => x.AmountSaved)
            .GreaterThanOrEqualTo(0m)
            .LessThanOrEqualTo(MaxAmount)
            .PrecisionScale(12, 2, false)
            .When(x => x.AmountSaved.HasValue);

        RuleFor(x => x)
            .Must(x => !x.AmountSaved.HasValue || x.AmountSaved.Value <= x.TargetAmount)
            .WithName(nameof(CreateBudgetMonthSavingsGoalCommand.AmountSaved))
            .WithMessage("AmountSaved must not exceed TargetAmount.");

        RuleFor(x => x.MonthlyContribution)
            .GreaterThanOrEqualTo(0m)
            .LessThanOrEqualTo(MaxAmount)
            .PrecisionScale(12, 2, false);
    }

    private DateOnly TodayLocal()
        => DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
}
