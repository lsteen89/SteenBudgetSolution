using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItemsBulk;

/// <summary>
/// Per-row rules mirror the single-row PatchBudgetMonthExpenseItem contract so the
/// bulk endpoint stays consistent with the existing slice. The whole request is
/// rejected if any row violates the rules.
/// </summary>
public sealed class PatchBudgetMonthExpenseItemsBulkCommandValidator
    : AbstractValidator<PatchBudgetMonthExpenseItemsBulkCommand>
{
    public PatchBudgetMonthExpenseItemsBulkCommandValidator()
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
                items == null || items.Select(i => i.MonthExpenseItemId).Distinct().Count() == items.Count)
            .WithMessage("Items must not contain duplicate MonthExpenseItemId values.")
            .When(x => x.Items is { Count: > 0 });

        RuleForEach(x => x.Items).SetValidator(new RowValidator());
    }

    private sealed class RowValidator : AbstractValidator<PatchBudgetMonthExpenseItemsBulkCommand.Row>
    {
        public RowValidator()
        {
            RuleFor(x => x.MonthExpenseItemId)
                .NotEmpty();

            RuleFor(x => x.CategoryId)
                .NotEmpty();

            RuleFor(x => x.Name)
                .Cascade(CascadeMode.Stop)
                .NotEmpty()
                .MaximumLength(120);

            RuleFor(x => x.AmountMonthly)
                .NotNull()
                .GreaterThanOrEqualTo(0m)
                .PrecisionScale(12, 2, false);

            RuleFor(x => x.SubscriptionLifecycleStatus)
                .MaximumLength(20)
                .When(x => x.SubscriptionLifecycleStatus is not null);

            RuleFor(x => x.Scope)
                .Must(BudgetMonthExpenseEditScopes.IsSupported)
                .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
        }
    }
}
