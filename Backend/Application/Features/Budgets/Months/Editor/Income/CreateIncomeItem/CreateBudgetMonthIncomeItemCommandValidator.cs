using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.CreateIncomeItem;

public sealed class CreateBudgetMonthIncomeItemCommandValidator
    : AbstractValidator<CreateBudgetMonthIncomeItemCommand>
{
    public CreateBudgetMonthIncomeItemCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.Kind)
            .Must(BudgetMonthIncomeItemKinds.IsSupportedCreateKind)
            .WithMessage("Kind must be sideHustle or householdMember.");

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(x => x.AmountMonthly)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false);

        // Narrower than `IsSupported` on purpose: create does not expose
        // `budgetPlanOnly` (see DTO comment). Null is allowed and resolved
        // to `currentMonthOnly` by the handler.
        RuleFor(x => x.Scope)
            .Must(BudgetMonthIncomeEditScopes.IsSupportedCreateScope)
            .WithMessage("Scope must be currentMonthOnly or currentMonthAndBudgetPlan.");
    }
}

