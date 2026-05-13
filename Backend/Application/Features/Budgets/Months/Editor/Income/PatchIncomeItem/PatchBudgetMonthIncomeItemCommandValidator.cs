using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItem;

public sealed class PatchBudgetMonthIncomeItemCommandValidator
    : AbstractValidator<PatchBudgetMonthIncomeItemCommand>
{
    public PatchBudgetMonthIncomeItemCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthIncomeItemId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(120)
            .When(x => x.Name is not null);

        RuleFor(x => x.AmountMonthly)
            .NotNull()
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthIncomeEditScopes.IsSupported)
            .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
    }
}

