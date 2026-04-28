namespace Backend.Application.Features.Budgets.Audit.Models;

public sealed record BudgetConfigChangeEventWriteModel(
    Guid Id,
    Guid BudgetId,
    string EntityType,
    Guid? EntityId,
    string ChangeType,
    string? BeforeJson,
    string? AfterJson,
    string? MetadataJson,
    DateTime ChangedAt,
    Guid ChangedByUserId);
