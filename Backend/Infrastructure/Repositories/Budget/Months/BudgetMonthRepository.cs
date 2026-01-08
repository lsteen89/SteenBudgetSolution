using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Models;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Budget.Months;

public sealed partial class BudgetMonthRepository : SqlBase, IBudgetMonthRepository
{
    public BudgetMonthRepository(
        IUnitOfWork unitOfWork,
        ILogger<BudgetMonthRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public Task<Guid?> GetBudgetIdByPersoidAsync(Guid persoid, CancellationToken ct)
        => QuerySingleOrDefaultAsync<Guid?>(GetBudgetIdByPersoid, new { Persoid = persoid }, ct);

    public async Task<IReadOnlyList<BudgetMonthListRm>> GetMonthsAsync(Guid budgetId, CancellationToken ct)
        => await QueryAsync<BudgetMonthListRm>(GetMonths, new { BudgetId = budgetId }, ct);

    public async Task<IReadOnlyList<BudgetMonthListRm>> GetOpenMonthsAsync(Guid budgetId, CancellationToken ct)
        => await QueryAsync<BudgetMonthListRm>(GetOpenMonths, new { BudgetId = budgetId }, ct);

    public Task InsertOpenMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(InsertOpenMonthIdempotent, new
        {
            Id = id,
            BudgetId = budgetId,
            YearMonth = yearMonth,
            Status = BudgetMonthStatuses.Open,
            CarryOverMode = carryOverMode,
            CarryOverAmount = carryOverAmount,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);

    public Task InsertSkippedMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(InsertSkippedMonthIdempotent, new
        {
            Id = id,
            BudgetId = budgetId,
            YearMonth = yearMonth,
            Status = BudgetMonthStatuses.Skipped,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);

    public Task<int> CloseOpenMonthWithSnapshotAsync(
        Guid budgetMonthId,
        Guid userId,
        DateTime nowUtc,
        decimal totalIncome,
        decimal totalExpenses,
        decimal totalSavings,
        decimal totalDebtPayments,
        decimal finalBalance,
        CancellationToken ct)
        => ExecuteAsync(CloseOpenMonthWithSnapshot, new
        {
            BudgetMonthId = budgetMonthId,
            NowUtc = nowUtc,
            UserId = userId,
            SnapshotTotalIncomeMonthly = totalIncome,
            SnapshotTotalExpensesMonthly = totalExpenses,
            SnapshotTotalSavingsMonthly = totalSavings,
            SnapshotTotalDebtPaymentsMonthly = totalDebtPayments,
            SnapshotFinalBalanceMonthly = finalBalance
        }, ct);

    public Task<int> MarkMonthSkippedAsync(Guid budgetMonthId, Guid userId, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync(MarkMonthSkipped, new
        {
            BudgetMonthId = budgetMonthId,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);
    public Task<BudgetMonthDetailsRm?> GetMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthDetailsRm>(GetMonth, new { BudgetId = budgetId, YearMonth = yearMonth }, ct);

    public async Task<bool> HasAnyMonthsAsync(Guid budgetId, CancellationToken ct)
    {
        return await ExecuteScalarAsync<bool>(ExistsAnyMonths, new { BudgetId = budgetId }, ct);
    }
}
