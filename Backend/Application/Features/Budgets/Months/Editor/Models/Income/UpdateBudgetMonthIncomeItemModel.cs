namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

public sealed record UpdateBudgetMonthIncomeItemModel(
    Guid Id,
    Guid BudgetMonthIncomeId,
    string Kind,
    string? Name,
    decimal AmountMonthly,
    bool IsActive,
    Guid ActorPersoid,
    DateTime UtcNow);
