using Backend.Application.DTO.Budget.Months;

namespace Backend.Application.Abstractions.Repositories.Budget;

public interface IBudgetMonthRepository
{
    Task<Guid?> GetBudgetIdByPersoidAsync(Guid persoid, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthRow>> GetMonthsAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BudgetMonthRow>> GetOpenMonthsAsync(Guid budgetId, CancellationToken ct);

    Task InsertOpenMonthIdempotentAsync(OpenMonthInsert insert, CancellationToken ct);
    Task InsertSkippedMonthIdempotentAsync(SkippedMonthInsert insert, CancellationToken ct);

    Task<bool> CloseOpenMonthWithSnapshotAsync(CloseMonthSnapshot snapshot, CancellationToken ct);
    Task MarkMonthSkippedAsync(Guid budgetMonthId, Guid userId, DateTime nowUtc, CancellationToken ct);

    Task<IAsyncDisposable> BeginTxAsync(CancellationToken ct);
    Task CommitTxAsync(CancellationToken ct);
    Task RollbackTxAsync(CancellationToken ct);
}

public sealed record BudgetMonthRow(
    Guid Id,
    Guid BudgetId,
    string YearMonth,
    string Status,
    DateTime OpenedAt,
    DateTime? ClosedAt,
    string CarryOverMode,
    decimal CarryOverAmount
);

public sealed record OpenMonthInsert(
    Guid BudgetId,
    string YearMonth,
    string CarryOverMode,
    decimal CarryOverAmount,
    Guid UserId,
    DateTime NowUtc
);

public sealed record SkippedMonthInsert(
    Guid BudgetId,
    string YearMonth,
    Guid UserId,
    DateTime NowUtc
);

public sealed record CloseMonthSnapshot(
    Guid BudgetMonthId,
    Guid UserId,
    DateTime NowUtc,
    decimal TotalIncome,
    decimal TotalExpenses,
    decimal TotalSavings,
    decimal TotalDebtPayments,
    decimal FinalBalance
);
