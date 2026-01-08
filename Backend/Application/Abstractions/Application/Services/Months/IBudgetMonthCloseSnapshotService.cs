using Backend.Application.Features.Budgets.Months.Models;
namespace Backend.Application.Abstractions.Application.Services.Budget;

public interface IBudgetMonthCloseSnapshotService
{
    Task<BudgetMonthCloseSnapshot?> ComputeAsync(
        Guid persoid,
        decimal carryOverAmount,
        CancellationToken ct);
}


