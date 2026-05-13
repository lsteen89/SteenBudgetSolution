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
}
