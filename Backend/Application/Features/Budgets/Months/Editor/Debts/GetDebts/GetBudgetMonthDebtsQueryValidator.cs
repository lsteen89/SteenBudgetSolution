using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;

public sealed class GetBudgetMonthDebtsQueryValidator
    : AbstractValidator<GetBudgetMonthDebtsQuery>
{
    public GetBudgetMonthDebtsQueryValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");
    }
}
