namespace Backend.Application.Features.Budgets.Months.Editor.Models.Income;

public sealed record UpdateBaselineIncomeItemModel(
    Guid IncomeItemId,
    string Kind,
    string? Name,
    decimal AmountMonthly,
    bool IsActive,
    Guid ActorPersoid,
    DateTime UtcNow);

