using Backend.Application.Features.Budgets.Months.Helpers;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Recap;

public sealed class GetBudgetMonthRecapQueryValidator
    : AbstractValidator<GetBudgetMonthRecapQuery>
{
    public GetBudgetMonthRecapQueryValidator()
    {
        RuleFor(x => x.YearMonth)
            .Must(YearMonthUtil.IsValid)
            .WithMessage("YearMonth must be in format yyyy-MM.");
    }
}
