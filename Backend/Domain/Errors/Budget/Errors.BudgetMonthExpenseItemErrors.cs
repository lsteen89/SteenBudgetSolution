
using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static partial class BudgetMonthExpenseItemErrors
{
    public static readonly Error NotFound =
        new("BudgetMonthExpenseItem.NotFound", "Expense item was not found in the selected month.");

    public static readonly Error RowDeleted =
        new("BudgetMonthExpenseItem.RowDeleted", "Expense item is already deleted.");

    public static readonly Error CannotUpdateDefaultForMonthOnlyRow =
        new("BudgetMonthExpenseItem.CannotUpdateDefaultForMonthOnlyRow", "Month-only expense items cannot update default budget data.");

    public static readonly Error SourceDefaultNotFound =
        new("BudgetMonthExpenseItem.SourceDefaultNotFound", "The linked default expense item no longer exists.");

    public static readonly Error InvalidCategory =
        new("BudgetMonthExpenseItem.InvalidCategory", "Selected category does not belong to the current budget.");
}