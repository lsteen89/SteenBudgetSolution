using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;

public sealed class PatchBudgetMonthDebtCommandValidator
    : AbstractValidator<PatchBudgetMonthDebtCommand>
{
    public PatchBudgetMonthDebtCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

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
