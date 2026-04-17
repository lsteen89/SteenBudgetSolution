using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.PatchExpenseItem;

public sealed class PatchBudgetMonthExpenseItemCommandValidator
    : AbstractValidator<PatchBudgetMonthExpenseItemCommand>
{
    public PatchBudgetMonthExpenseItemCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

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
    }
}