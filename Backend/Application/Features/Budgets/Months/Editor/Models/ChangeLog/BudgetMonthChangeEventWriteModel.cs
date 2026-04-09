namespace Backend.Application.Features.Budgets.Months.Editor.Models.ChangeLog;

public sealed record BudgetMonthChangeEventWriteModel(
    Guid Id,
    Guid BudgetMonthId,
    string EntityType,
    Guid EntityId,
    Guid? SourceEntityId,
    string ChangeType,
    string? ChangeSetJson,
    Guid ChangedByUserId,
    DateTime ChangedAt);