using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Income.Models;
using Backend.Application.Features.Budgets.Months.Models;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthRepository
{
    Task<Guid?> GetBudgetIdByPersoidAsync(Guid persoid, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthListRm>> GetMonthsAsync(Guid budgetId, CancellationToken ct);
    Task<IReadOnlyList<BudgetMonthListRm>> GetOpenMonthsAsync(Guid budgetId, CancellationToken ct);

    Task<BudgetMonthLookupRm?> GetByBudgetIdAndYearMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct);
    Task<BudgetMonthDetailsRm?> GetMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct);
    Task<IncomePaymentTimingReadModel?> GetBudgetMonthIncomePaymentTimingAsync(Guid budgetMonthId, CancellationToken ct);

    Task<bool> HasAnyMonthsAsync(Guid budgetId, CancellationToken ct);

    Task InsertOpenMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);

    Task InsertSkippedMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);

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

    Task<int> UpdateCarryOverSettingsAsync(
        Guid budgetMonthId,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> MarkMonthSkippedAsync(
        Guid budgetMonthId,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct);

    Task<int> UpdateBudgetMonthIncomePaymentTimingAsync(
        Guid budgetMonthId,
        string incomePaymentDayType,
        int? incomePaymentDay,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct);
}
