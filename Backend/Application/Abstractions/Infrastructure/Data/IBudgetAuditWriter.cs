using Backend.Application.Features.Budgets.Audit.Models;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetAuditWriter
{
    Task WriteConfigChangeAsync(BudgetConfigChangeEventWriteModel model, CancellationToken ct);

    Task WriteLifecycleAsync(BudgetMonthLifecycleEventWriteModel model, CancellationToken ct);
}
