namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

public sealed record InsertBudgetMonthIncomeItemModel(
    Guid Id,
    Guid BudgetMonthIncomeId,
    string Kind,
    Guid? SourceIncomeItemId,
    string Name,
    decimal AmountMonthly,
    bool IsActive,
    bool IsDeleted,
    Guid ActorPersoid,
    DateTime UtcNow);

