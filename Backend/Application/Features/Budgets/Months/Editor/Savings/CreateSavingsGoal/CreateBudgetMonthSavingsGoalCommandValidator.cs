using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.CreateSavingsGoal;

public sealed class CreateBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<CreateBudgetMonthSavingsGoalCommand>
{
    public CreateBudgetMonthSavingsGoalCommandValidator()
    {
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
            .PrecisionScale(12, 2, false);

        RuleFor(x => x.AmountSaved)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false)
            .When(x => x.AmountSaved.HasValue);

        RuleFor(x => x)
            .Must(x => !x.AmountSaved.HasValue || x.AmountSaved.Value <= x.TargetAmount)
            .WithName(nameof(CreateBudgetMonthSavingsGoalCommand.AmountSaved))
            .WithMessage("AmountSaved must not exceed TargetAmount.");

        RuleFor(x => x.MonthlyContribution)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false);
    }
}
