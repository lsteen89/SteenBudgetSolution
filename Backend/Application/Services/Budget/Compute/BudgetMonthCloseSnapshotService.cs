using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Features.Budgets.Months.Models;

namespace Backend.Application.Services.Budget.Compute;

public sealed class BudgetMonthCloseSnapshotService : IBudgetMonthCloseSnapshotService
{
    private readonly IBudgetMonthlyTotalsService _totals;

    public BudgetMonthCloseSnapshotService(IBudgetMonthlyTotalsService totals)
        => _totals = totals;

    public async Task<BudgetMonthCloseSnapshot?> ComputeAsync(
        Guid persoid,
        decimal carryOverAmount,
        CancellationToken ct)
    {
        var totals = await _totals.ComputeAsync(persoid, ct);
        if (totals is null) return null;

        var finalBalance =
            totals.TotalIncome
            - totals.TotalExpenses
            - totals.TotalSavings
            - totals.TotalDebtPayments
            + carryOverAmount;

        return new BudgetMonthCloseSnapshot(
            totals.TotalIncome,
            totals.TotalExpenses,
            totals.TotalSavings,
            totals.TotalDebtPayments,
            finalBalance
        );
    }
}
