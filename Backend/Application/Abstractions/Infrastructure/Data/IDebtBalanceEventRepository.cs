using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

namespace Backend.Application.Abstractions.Infrastructure.Data;

// Debt PR 3: structured-history writer for `DebtBalanceEvent`. Mirrors the
// minimal shape of `IBudgetMonthChangeEventRepository` — a write-only
// abstraction the editor and lifecycle slices share. Reads (progress /
// recent-events list) belong to PR 5's read-model surface, not here.
public interface IDebtBalanceEventRepository
{
    Task InsertAsync(DebtBalanceEventWriteModel model, CancellationToken ct);
}
