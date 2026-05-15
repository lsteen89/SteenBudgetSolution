using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static partial class BudgetMonthDebtErrors
{
    public static readonly Error NotFound =
        new("BudgetMonthDebt.NotFound", "Debt was not found in the selected month.");

    public static readonly Error RowDeleted =
        new("BudgetMonthDebt.RowDeleted", "Debt is already deleted.");

    public static readonly Error RowClosed =
        new("BudgetMonthDebt.RowClosed", "Debt is closed and cannot be edited.");

    public static readonly Error CannotUpdatePlanForMonthOnlyRow =
        new("BudgetMonthDebt.CannotUpdatePlanForMonthOnlyRow", "Month-only debts cannot update budget plan data.");

    public static readonly Error SourcePlanNotFound =
        new("BudgetMonthDebt.SourcePlanNotFound", "The linked budget plan debt no longer exists.");
}
