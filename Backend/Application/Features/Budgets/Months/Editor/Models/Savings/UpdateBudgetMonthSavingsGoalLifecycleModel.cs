namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

public sealed record UpdateBudgetMonthSavingsGoalLifecycleModel(
    Guid Id,
    Guid BudgetMonthSavingsId,
    string Status,
    string? ClosedReason,
    DateTime? ClosedAt,
    bool IsDeleted,
    Guid ActorPersoid,
    DateTime UtcNow);
