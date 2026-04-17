using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Expense.CreateExpenseItem;

public sealed class CreateBudgetMonthExpenseItemCommandValidator
    : AbstractValidator<CreateBudgetMonthExpenseItemCommand>
{
    public CreateBudgetMonthExpenseItemCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.CategoryId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(x => x.AmountMonthly)
            .GreaterThanOrEqualTo(0m)
            .PrecisionScale(12, 2, false);
    }
}