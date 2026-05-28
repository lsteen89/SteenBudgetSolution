namespace Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

public sealed record BudgetMonthExpenseItemEditorRowReadModel(
    Guid Id,
    Guid? SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    string? SubscriptionLifecycleStatus,
    bool IsActive,
    bool IsDeleted,
    // Source-plan values for the linked ExpenseItem row, if any.
    // Null for month-only rows (SourceExpenseItemId is null) and remain null
    // if the source row was hard-deleted. Read-only — mutations do not use these.
    Guid? SourceCategoryId,
    string? SourceName,
    decimal? SourceAmountMonthly,
    bool? SourceIsActive);
