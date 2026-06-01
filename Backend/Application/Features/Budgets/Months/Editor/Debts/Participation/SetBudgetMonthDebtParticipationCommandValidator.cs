using Backend.Application.Constants;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.Participation;

// Mirrors the planned-payment / details / balance validators so editor-side
// rules stay consistent across debt mutation paths. `Participation` is
// restricted to `included` / `notIncluded`; `removed` is explicitly excluded
// because it must travel through the dedicated remove command (with its own
// rejection rule for source-linked rows).
//
// `Note` cap matches the `ParticipationReason VARCHAR(255)` column.
public sealed class SetBudgetMonthDebtParticipationCommandValidator
    : AbstractValidator<SetBudgetMonthDebtParticipationCommand>
{
    public SetBudgetMonthDebtParticipationCommandValidator()
    {
        RuleFor(x => x.Persoid).NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthDebtId).NotEmpty();

        RuleFor(x => x.Participation)
            .Must(value =>
                value == BudgetMonthDebtParticipationStatuses.Included ||
                value == BudgetMonthDebtParticipationStatuses.NotIncluded)
            .WithMessage("Participation must be either included or notIncluded.");

        RuleFor(x => x.Note)
            .MaximumLength(255)
            .When(x => x.Note is not null);
    }
}
