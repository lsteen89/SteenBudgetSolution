using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Audit;
using Backend.Application.Features.Budgets.Income.Models;
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

    public async Task<IReadOnlyList<BudgetMonthListRm>> GetPlannedMonthsAsync(Guid budgetId, CancellationToken ct)
        => await QueryAsync<BudgetMonthListRm>(GetPlannedMonths, new { BudgetId = budgetId }, ct);

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

    public Task InsertPlannedMonthIdempotentAsync(
        Guid id,
        Guid budgetId,
        string yearMonth,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(InsertPlannedMonthIdempotent, new
        {
            Id = id,
            BudgetId = budgetId,
            YearMonth = yearMonth,
            Status = BudgetMonthStatuses.Planned,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);

    public Task<int> PromotePlannedMonthToOpenAsync(
        Guid budgetMonthId,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(PromotePlannedMonthToOpen, new
        {
            BudgetMonthId = budgetMonthId,
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

    public Task<int> UpdateCarryOverSettingsAsync(
        Guid budgetMonthId,
        string carryOverMode,
        decimal? carryOverAmount,
        Guid userId,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(UpdateCarryOverSettings, new
        {
            BudgetMonthId = budgetMonthId,
            CarryOverMode = carryOverMode,
            CarryOverAmount = carryOverAmount,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);

    public Task<int> MarkMonthSkippedAsync(Guid budgetMonthId, Guid userId, DateTime nowUtc, CancellationToken ct)
        => ExecuteAsync(MarkMonthSkipped, new
        {
            BudgetMonthId = budgetMonthId,
            NowUtc = nowUtc,
            UserId = userId
        }, ct);

    public Task<int> UpdateBudgetMonthIncomePaymentTimingAsync(
        Guid budgetMonthId,
        string incomePaymentDayType,
        int? incomePaymentDay,
        Guid actorPersoid,
        DateTime nowUtc,
        CancellationToken ct)
        => ExecuteAsync(UpdateBudgetMonthIncomePaymentTiming, new
        {
            BudgetMonthId = budgetMonthId,
            IncomePaymentDayType = incomePaymentDayType,
            IncomePaymentDay = incomePaymentDay,
            ActorPersoid = actorPersoid,
            NowUtc = nowUtc
        }, ct);

    public Task<BudgetMonthDetailsRm?> GetMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthDetailsRm>(GetMonth, new { BudgetId = budgetId, YearMonth = yearMonth }, ct);

    public Task<string?> GetPreviousComparableYearMonthAsync(Guid budgetId, string yearMonth, CancellationToken ct)
        => QuerySingleOrDefaultAsync<string?>(
            GetPreviousComparableYearMonth,
            new { BudgetId = budgetId, YearMonth = yearMonth },
            ct);

    public Task<BudgetMonthCarryOverOutcomeRm?> GetCarryOverOutcomeForClosedMonthAsync(
        Guid sourceBudgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<BudgetMonthCarryOverOutcomeRm>(
            GetCarryOverOutcomeForClosedMonth,
            new
            {
                SourceBudgetMonthId = sourceBudgetMonthId,
                EventType = BudgetMonthLifecycleEventTypes.CarryOverApplied
            },
            ct);

    public async Task<IReadOnlyList<BudgetMonthExpenseCategoryTotalRm>> GetExpenseCategoryTotalsAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthExpenseCategoryTotalRm>(
            GetExpenseCategoryTotals,
            new
            {
                BudgetMonthId = budgetMonthId,
                ActiveSubscriptionLifecycleStatus = BudgetMonthSubscriptionLifecycleStatuses.Active
            },
            ct);

    public async Task<IReadOnlyList<BudgetMonthSubscriptionRm>> GetSubscriptionsAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthSubscriptionRm>(
            GetSubscriptions,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthSavingsGoalRm>> GetSavingsGoalsAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthSavingsGoalRm>(
            GetSavingsGoals,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthCompletedSavingsGoalRm>> GetCompletedSavingsGoalsAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthCompletedSavingsGoalRm>(
            GetCompletedSavingsGoals,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<IReadOnlyList<BudgetMonthDebtRm>> GetDebtsAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => await QueryAsync<BudgetMonthDebtRm>(
            GetDebts,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public Task<IncomePaymentTimingReadModel?> GetBudgetMonthIncomePaymentTimingAsync(
        Guid budgetMonthId,
        CancellationToken ct)
        => QuerySingleOrDefaultAsync<IncomePaymentTimingReadModel>(
            GetBudgetMonthIncomePaymentTiming,
            new { BudgetMonthId = budgetMonthId },
            ct);

    public async Task<bool> HasAnyMonthsAsync(Guid budgetId, CancellationToken ct)
    {
        return await ExecuteScalarAsync<bool>(ExistsAnyMonths, new { BudgetId = budgetId }, ct);
    }
    public Task<BudgetMonthLookupRm?> GetByBudgetIdAndYearMonthAsync(
    Guid budgetId,
    string yearMonth,
    CancellationToken ct)
    => QuerySingleOrDefaultAsync<BudgetMonthLookupRm>(
        GetBudgetMonthLookupByBudgetIdAndYearMonth,
        new { BudgetId = budgetId, YearMonth = yearMonth },
        ct);
}
