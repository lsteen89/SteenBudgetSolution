using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtsBulk;

public sealed class PatchBudgetMonthDebtsBulkCommandValidator
    : AbstractValidator<PatchBudgetMonthDebtsBulkCommand>
{
    public PatchBudgetMonthDebtsBulkCommandValidator()
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
                items == null || items.Select(i => i.MonthDebtId).Distinct().Count() == items.Count)
            .WithMessage("Items must not contain duplicate MonthDebtId values.")
            .When(x => x.Items is { Count: > 0 });

        RuleForEach(x => x.Items).SetValidator(new RowValidator());
    }

    private sealed class RowValidator : AbstractValidator<PatchBudgetMonthDebtsBulkCommand.Row>
    {
        public RowValidator()
        {
            RuleFor(x => x.MonthDebtId)
                .NotEmpty();

            RuleFor(x => x.MonthlyPayment)
                .GreaterThanOrEqualTo(0m)
                .PrecisionScale(12, 2, false);

            RuleFor(x => x.Scope)
                .Must(BudgetMonthDebtEditScopes.IsSupported)
                .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
        }
    }
}
