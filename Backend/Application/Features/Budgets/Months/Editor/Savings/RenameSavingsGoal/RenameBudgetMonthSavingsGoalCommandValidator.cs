using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RenameSavingsGoal;

/// <summary>
/// Validates the V2 rename request. `Name` follows the same shape as
/// `CreateBudgetMonthSavingsGoalCommandValidator.Name` so the rename
/// surface cannot accept a value the create surface would reject. The
/// handler is responsible for trimming before persistence — the
/// validator stays pure and message-friendly.
/// </summary>
public sealed class RenameBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<RenameBudgetMonthSavingsGoalCommand>
{
    public RenameBudgetMonthSavingsGoalCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthSavingsGoalId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(255).WithMessage("Name must be 255 characters or fewer.");
    }
}
