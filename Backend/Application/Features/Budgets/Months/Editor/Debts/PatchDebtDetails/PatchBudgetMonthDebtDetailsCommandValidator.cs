using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebtDetails;

// Same rules as `CreateBudgetMonthDebtCommandValidator` minus the Balance
// field. Detail edits must not introduce a new debt type or violate the
// wizard's revolving / installment cross-field rules.
public sealed class PatchBudgetMonthDebtDetailsCommandValidator
    : AbstractValidator<PatchBudgetMonthDebtDetailsCommand>
{
    private static readonly HashSet<string> SupportedDebtTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        DebtTypes.Revolving,
        DebtTypes.Installment,
        DebtTypes.BankLoan,
        DebtTypes.Private
    };

    public PatchBudgetMonthDebtDetailsCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthDebtId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(255);

        RuleFor(x => x.Type)
            .NotEmpty()
            .Must(SupportedDebtTypes.Contains)
            .WithMessage(
                $"Type must be one of {string.Join(", ", SupportedDebtTypes)}.");

        RuleFor(x => x.Apr)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(16, 2, false);

        RuleFor(x => x.MonthlyFee)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(16, 2, false)
            .When(x => x.MonthlyFee.HasValue);

        RuleFor(x => x.MinPayment)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(16, 2, false)
            .When(x => x.MinPayment.HasValue);

        RuleFor(x => x.MinPayment)
            .NotNull()
            .GreaterThanOrEqualTo(1m)
            .When(x => string.Equals(x.Type, DebtTypes.Revolving, StringComparison.OrdinalIgnoreCase))
            .WithMessage("MinPayment is required and must be at least 1 for revolving debts.");

        RuleFor(x => x.TermMonths)
            .GreaterThanOrEqualTo(1)
            .When(x => x.TermMonths.HasValue);

        RuleFor(x => x.TermMonths)
            .NotNull()
            .GreaterThanOrEqualTo(1)
            .When(x =>
                string.Equals(x.Type, DebtTypes.Installment, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(x.Type, DebtTypes.BankLoan, StringComparison.OrdinalIgnoreCase))
            .WithMessage("TermMonths is required and must be at least 1 for installment and bank-loan debts.");

        RuleFor(x => x.MonthlyPayment)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(16, 2, false);

        RuleFor(x => x.Scope)
            .Must(BudgetMonthDebtEditScopes.IsSupported)
            .WithMessage("Scope must be currentMonthOnly, currentMonthAndBudgetPlan, or budgetPlanOnly.");
    }
}
