using Backend.Application.Features.Budgets.Months.Models;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthRepository
{
    Task<Guid?> GetBudgetIdByPersoidAsync(Guid persoid, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthListRm>> GetMonthsAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BudgetMonthListRm>> GetOpenMonthsAsync(Guid budgetId, CancellationToken ct);

    Task InsertOpenMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);
    Task<bool> HasAnyMonthsAsync(Guid budgetId, CancellationToken ct);
    Task InsertSkippedMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);

    /// <summary>
    /// Returns affected rows. 0 = already closed/not open (idempotent close).
    /// </summary>
    Task<int> CloseOpenMonthWithSnapshotAsync(
        Guid budgetMonthId,
        Guid userId,
        DateTime nowUtc,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance,
        CancellationToken ct);

    Task<int> MarkMonthSkippedAsync(
        Guid budgetMonthId,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);
    Task<BudgetMonthDetailsRm?> GetMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct);
}
