using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;

// Debt PR 5: same shape as the legacy `GetBudgetMonthDebtsQueryValidator`.
// Kept verbatim so future yearMonth-format tweaks land in one obvious place
// and so the two debt-editor read endpoints fail with identical messages
// during the migration window between them.
public sealed class GetBudgetMonthDebtEditorQueryValidator
    : AbstractValidator<GetBudgetMonthDebtEditorQuery>
{
    public GetBudgetMonthDebtEditorQueryValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");
    }
}
