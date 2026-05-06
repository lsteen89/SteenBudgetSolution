namespace Backend.Application.Features.Budgets.Months.Editor.Models.Expense;

public sealed record UpdateBudgetMonthExpenseItemModel(
    Guid Id,
    Guid BudgetMonthId,
    Guid CategoryId,
    string Name,
    decimal AmountMonthly,
    string? SubscriptionLifecycleStatus,
    bool IsActive,
    Guid ActorPersoid,
    DateTime UtcNow);
