namespace Backend.Application.Features.Budgets.Audit.Models;

public sealed record BudgetMonthLifecycleEventWriteModel(
    Guid Id,
    Guid BudgetMonthId,
    string EventType,
    Guid? RelatedBudgetMonthId,
    string? CarryOverMode,
    decimal? CarryOverAmount,
    string? MetadataJson,
    DateTime OccurredAt,
    Guid OccurredByUserId);
