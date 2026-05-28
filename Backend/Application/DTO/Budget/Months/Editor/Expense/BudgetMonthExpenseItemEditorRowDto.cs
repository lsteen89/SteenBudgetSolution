namespace Backend.Application.DTO.Budget.Months.Editor.Expense;

public sealed record BudgetMonthExpenseItemEditorRowDto(
    Guid Id,
    Guid? SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    string? SubscriptionLifecycleStatus,
    bool IsActive,
    bool IsDeleted,
    bool IsMonthOnly,
    bool CanUpdateDefault,
    // Source-plan values for the linked ExpenseItem row, if any. Null for
    // month-only rows. Exposed read-only so the frontend can compute plan-vs-
    // current-month deltas honestly. Mutation payloads ignore these fields.
    Guid? SourceCategoryId,
    string? SourceName,
    decimal? SourceAmountMonthly,
    bool? SourceIsActive);
