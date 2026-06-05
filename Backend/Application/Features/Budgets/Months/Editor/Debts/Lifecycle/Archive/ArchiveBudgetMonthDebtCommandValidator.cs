using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Lifecycle.Archive;

public sealed class ArchiveBudgetMonthDebtCommandValidator
    : AbstractValidator<ArchiveBudgetMonthDebtCommand>
{
    public ArchiveBudgetMonthDebtCommandValidator()
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
