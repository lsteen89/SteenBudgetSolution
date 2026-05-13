using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Income.PatchIncomeItemsBulk;

public sealed class PatchBudgetMonthIncomeItemsBulkCommandValidator
    : AbstractValidator<PatchBudgetMonthIncomeItemsBulkCommand>
{
    public PatchBudgetMonthIncomeItemsBulkCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.Items)
            .NotNull()
            .Must(items => items != null && items.Count > 0)
            .WithMessage("Items must contain at least one row.");

        RuleFor(x => x.Items)
            .Must(items =>
                items == null || items.Select(i => i.MonthIncomeItemId).Distinct().Count() == items.Count)
            .WithMessage("Items must not contain duplicate MonthIncomeItemId values.")
            .When(x => x.Items is { Count: > 0 });

        RuleForEach(x => x.Items).SetValidator(new RowValidator());
    }

    private sealed class RowValidator : AbstractValidator<PatchBudgetMonthIncomeItemsBulkCommand.Row>
    {
        public RowValidator()
        {
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
}

