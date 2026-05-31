using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;

// Mirrors the planned-payment / details validators so editor-side rules
// stay consistent across the three debt mutation paths:
//   * non-negative money values (balance is a liability, never negative)
//   * decimal precision matches `DECIMAL(18,2)` columns
//   * scope is constrained to the three editor scopes
//
// Length cap on `Note` (500 chars) matches the `VARCHAR(500)` cap on
// `DebtBalanceEvent.Note` so a too-long note fails at the validator with
// a friendly message instead of a SQL truncation.
public sealed class AdjustBudgetMonthDebtBalanceCommandValidator
    : AbstractValidator<AdjustBudgetMonthDebtBalanceCommand>
{
    public AdjustBudgetMonthDebtBalanceCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthDebtId)
            .NotEmpty();

        RuleFor(x => x.NewBalance)
            .GreaterThanOrEqualTo(0m)
            .WithMessage("Balance must be zero or positive.")
            .PrecisionScale(16, 2, false);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthDebtEditScopes.IsSupported)
            .WithMessage(
                "Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");

        RuleFor(x => x.Note)
            .MaximumLength(500)
            .When(x => x.Note is not null);
    }
}
