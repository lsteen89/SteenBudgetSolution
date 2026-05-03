namespace Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

public sealed record BudgetMonthExpenseItemEditorRowReadModel(
    Guid Id,
    Guid? SourceExpenseItemId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    string? SubscriptionLifecycleStatus,
    bool IsActive,
    bool IsDeleted);
