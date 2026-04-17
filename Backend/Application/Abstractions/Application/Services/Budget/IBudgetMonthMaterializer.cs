using Backend.Domain.Shared;

namespace Backend.Application.Abstractions.Application.Services.Budget;

public interface IBudgetMonthMaterializer
{
    Task<Result<bool>> MaterializeIfMissingAsync(
        Guid budgetId,
        Guid budgetMonthId,
        Guid actorPersoid,
        CancellationToken ct);
}