using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.MarkPaidOff;

// Lifecycle transitions take no money values, so the validator is narrower
// than its planned-payment / balance siblings. Note cap matches
// `Debt.LifecycleReason VARCHAR(255)`.
public sealed class MarkBudgetMonthDebtPaidOffCommandValidator
    : AbstractValidator<MarkBudgetMonthDebtPaidOffCommand>
{
    public MarkBudgetMonthDebtPaidOffCommandValidator()
    {
        RuleFor(x => x.Persoid).NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthDebtId).NotEmpty();

        RuleFor(x => x.Note)
            .MaximumLength(255)
            .When(x => x.Note is not null);
    }
}
