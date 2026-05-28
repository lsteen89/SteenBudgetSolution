using FluentValidation;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.TransferSavingsGoal;

/// <summary>
/// PR-07 validator surface. Mirrors the bounds chosen for
/// <see cref="ChangeSavingsGoalTargetAmount.ChangeBudgetMonthSavingsGoalTargetAmountCommandValidator"/>
/// so the two financial fields share the same caps and precision.
///
/// The "withdraw must not push <c>AmountSaved</c> below zero" rule is
/// *not* validated here — it depends on the loaded row and lives in the
/// handler.
/// </summary>
public sealed class TransferBudgetMonthSavingsGoalCommandValidator
    : AbstractValidator<TransferBudgetMonthSavingsGoalCommand>
{
    public const decimal MaxAmount = 10_000_000m;
    public const int NoteMaxLength = 200;

    public TransferBudgetMonthSavingsGoalCommandValidator()
    {
        RuleFor(x => x.Persoid)
            .NotEmpty();

        RuleFor(x => x.YearMonth)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("YearMonth must be in format yyyy-MM.");

        RuleFor(x => x.MonthSavingsGoalId)
            .NotEmpty();

        RuleFor(x => x.Amount)
            .Cascade(CascadeMode.Stop)
            .GreaterThan(0m).WithMessage("Amount must be greater than zero.")
            .LessThanOrEqualTo(MaxAmount)
                .WithMessage($"Amount must be {MaxAmount:0} or less.")
            .PrecisionScale(12, 2, false)
                .WithMessage("Amount must have at most 2 decimal places.");

        RuleFor(x => x.Direction)
            .Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Direction is required.")
            .Must(SavingsGoalTransferDirections.IsSupported)
                .WithMessage("Direction must be 'deposit' or 'withdraw'.");

        RuleFor(x => x.Note)
            .MaximumLength(NoteMaxLength)
                .WithMessage($"Note must be {NoteMaxLength} characters or less.")
            .When(x => x.Note is not null);
    }
}
