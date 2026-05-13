using Backend.Domain.Shared;

namespace Backend.Domain.Errors.Budget;

public static partial class BudgetMonthIncomeItemErrors
{
    public static readonly Error NotFound =
        new("BudgetMonthIncomeItem.NotFound", "Income item was not found in the selected month.");

    public static readonly Error RowDeleted =
        new("BudgetMonthIncomeItem.RowDeleted", "Income item is already deleted.");

    public static readonly Error CannotUpdatePlanForMonthOnlyRow =
        new("BudgetMonthIncomeItem.CannotUpdatePlanForMonthOnlyRow", "Month-only income items cannot update budget plan data.");

    public static readonly Error SourcePlanNotFound =
        new("BudgetMonthIncomeItem.SourcePlanNotFound", "The linked budget plan income item no longer exists.");

    public static readonly Error InvalidKind =
        new("BudgetMonthIncomeItem.InvalidKind", "Income item type is not supported.");

    public static readonly Error SalaryNameCannotBeChanged =
        new("BudgetMonthIncomeItem.SalaryNameCannotBeChanged", "Salary income rows do not support name changes.");

    public static readonly Error SalaryCannotBeDeleted =
        new("BudgetMonthIncomeItem.SalaryCannotBeDeleted", "Salary income rows cannot be deleted.");
}
