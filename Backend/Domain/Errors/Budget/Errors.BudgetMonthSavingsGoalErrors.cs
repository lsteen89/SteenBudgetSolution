using Backend.Domain.Common.Constants;
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static partial class BudgetMonthSavingsGoalErrors
{
    public static readonly Error NotFound =
        new("BudgetMonthSavingsGoal.NotFound", "Savings goal was not found in the selected month.");

    public static readonly Error RowDeleted =
        new("BudgetMonthSavingsGoal.RowDeleted", "Savings goal is already deleted.");

    public static readonly Error RowClosed =
        new("BudgetMonthSavingsGoal.RowClosed", "Savings goal is closed and cannot be edited.");

    public static readonly Error CannotUpdatePlanForMonthOnlyRow =
        new("BudgetMonthSavingsGoal.CannotUpdatePlanForMonthOnlyRow", "Month-only savings goals cannot update budget plan data.");

    public static readonly Error SourcePlanNotFound =
        new("BudgetMonthSavingsGoal.SourcePlanNotFound", "The linked budget plan savings goal no longer exists.");

    public static readonly Error SavingsPlanMissing =
        new(
            "BudgetMonthSavingsGoal.SavingsPlanMissing",
            "The budget plan does not have a savings record yet; a savings goal cannot be created.",
            ErrorType.Conflict);

    // V2: a target-amount edit cannot move below the already-saved figure.
    // The UI surfaces this inline so the BE rejection is a defensive last
    // line, not the primary signal.
    public static readonly Error TargetBelowSaved =
        new(
            "BudgetMonthSavingsGoal.TargetBelowSaved",
            "New target amount cannot be less than the amount already saved.",
            ErrorType.Conflict);

    // V2 PR-07: a one-time withdraw cannot push AmountSaved below zero.
    // The UI mirrors this rule inline; the BE rejection is the defensive
    // last line. We model it as Conflict (not Validation) because the
    // failure depends on server-side row state, not the request shape.
    public static readonly Error WithdrawalBelowZero =
        new(
            "BudgetMonthSavingsGoal.WithdrawalBelowZero",
            "Withdrawal cannot push the saved amount below zero.",
            ErrorType.Conflict);

    // V2 PR-07: an unrecognised transfer direction. Validator catches the
    // common case (empty / typoed body); this guard is the handler-side
    // defence for clients that bypass validation.
    public static readonly Error UnknownTransferDirection =
        new(
            "BudgetMonthSavingsGoal.UnknownTransferDirection",
            "Transfer direction must be 'deposit' or 'withdraw'.",
            ErrorType.Validation);
}
