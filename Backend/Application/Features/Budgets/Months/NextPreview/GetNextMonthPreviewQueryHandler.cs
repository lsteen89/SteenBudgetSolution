using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.Helpers.Currency;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.NextPreview;

/// <summary>
/// Produces a read-only next-month preview from the budget plan.
///
/// Hard guarantees (proven by integration tests):
/// <list type="bullet">
/// <item>No <c>BudgetMonth</c> is inserted and no month tables are materialised
/// — the lifecycle ensure/materialise path is never touched.</item>
/// <item>Preview totals come from the shared <see cref="IBudgetDashboardProjector"/>,
/// so they reconcile with the live dashboard's math.</item>
/// <item>Carry-over is an estimate (the current open month's live final balance,
/// floored at zero) and is flagged non-final.</item>
/// </list>
///
/// The preview is only offered from the user's active open month. Any other
/// from-month (missing, closed, skipped) yields an <c>"unavailable"</c> state
/// rather than a fabricated projection — we never preview an arbitrary month.
/// </summary>
public sealed class GetNextMonthPreviewQueryHandler
    : IQueryHandler<GetNextMonthPreviewQuery, Result<NextMonthPreviewDto>>
{
    private const string StatePreview = "preview";
    private const string StateUnavailable = "unavailable";
    private const string BasisBudgetPlan = "budgetPlan";

    private const string CarryModeNone = "none";
    private const string CarryModeEstimatedFull = "estimatedFull";
    private const string CarrySourceNone = "none";
    private const string CarrySourceCurrentMonthLiveFinalBalance = "currentMonthLiveFinalBalance";

    private const string LimitationFromOpenMonthOnly =
        "Next-month preview is available from your current open month.";
    private const string LimitationPlanBasis =
        "Projected from your budget plan with nothing changed.";
    private const string LimitationEstimatedCarryOver =
        "Carry-over is estimated from this month's balance and is finalised when the month closes.";

    private readonly IBudgetMonthRepository _months;
    private readonly IBudgetMonthSeedSourceRepository _seedSource;
    private readonly IBudgetMonthDashboardRepository _monthDashRepo;
    private readonly INextMonthPreviewReadModelBuilder _previewBuilder;
    private readonly IBudgetDashboardProjector _projector;
    private readonly IUserRepository _users;

    public GetNextMonthPreviewQueryHandler(
        IBudgetMonthRepository months,
        IBudgetMonthSeedSourceRepository seedSource,
        IBudgetMonthDashboardRepository monthDashRepo,
        INextMonthPreviewReadModelBuilder previewBuilder,
        IBudgetDashboardProjector projector,
        IUserRepository users)
    {
        _months = months;
        _seedSource = seedSource;
        _monthDashRepo = monthDashRepo;
        _previewBuilder = previewBuilder;
        _projector = projector;
        _users = users;
    }

    public async Task<Result<NextMonthPreviewDto>> Handle(
        GetNextMonthPreviewQuery q,
        CancellationToken ct)
    {
        if (!YearMonthUtil.IsValid(q.FromYearMonth))
            return Result<NextMonthPreviewDto>.Failure(BudgetMonth.InvalidYearMonth);

        var fromYearMonth = YearMonthUtil.Normalize(q.FromYearMonth);
        var previewYearMonth = YearMonthUtil.AddMonths(fromYearMonth, 1);

        var prefs = await _users.GetUserPreferencesAsync(q.Persoid, ct);
        var currencyCode = CurrencyHelper.NormalizeCurrencyOrDefault(prefs?.Currency, "SEK");

        var budgetId = await _months.GetBudgetIdByPersoidAsync(q.Persoid, ct);
        if (budgetId is null)
            return Unavailable(fromYearMonth, previewYearMonth, currencyCode);

        // The preview is only honest when projected forward from the active open
        // month. Reading the from-month is a plain SELECT — it never ensures or
        // materialises anything (unlike the dashboard's EnsureAccessibleMonth).
        var fromMonth = await _months.GetMonthAsync(budgetId.Value, fromYearMonth, ct);
        if (fromMonth is null || fromMonth.Status != BudgetMonthStatuses.Open)
            return Unavailable(fromYearMonth, previewYearMonth, currencyCode);

        // Plan-row reads only. None of these touch month tables.
        var seed = new BudgetPlanSeed(
            Income: await _seedSource.GetIncomeAsync(budgetId.Value, ct),
            SideHustles: await _seedSource.GetActiveSideHustlesAsync(budgetId.Value, ct),
            HouseholdMembers: await _seedSource.GetActiveHouseholdMembersAsync(budgetId.Value, ct),
            ExpenseItems: await _seedSource.GetActiveExpenseItemsAsync(budgetId.Value, ct),
            Savings: await _seedSource.GetSavingsAsync(budgetId.Value, ct),
            SavingsGoals: await _seedSource.GetActiveSavingsGoalsAsync(budgetId.Value, ct),
            Debts: await _seedSource.GetActiveDebtsAsync(budgetId.Value, ct),
            RepaymentStrategy: await _seedSource.GetRepaymentStrategyAsync(budgetId.Value, ct));

        var carryOver = await EstimateCarryOverAsync(fromMonth.Id, fromMonth.CarryOverAmount, ct);

        var readModel = _previewBuilder.Build(budgetId.Value, seed);
        var dashboard = _projector.Project(readModel, carryOver.Amount);

        var limitations = new List<string> { LimitationPlanBasis };
        if (carryOver.Mode == CarryModeEstimatedFull)
            limitations.Add(LimitationEstimatedCarryOver);

        return Result<NextMonthPreviewDto>.Success(new NextMonthPreviewDto(
            FromYearMonth: fromYearMonth,
            PreviewYearMonth: previewYearMonth,
            State: StatePreview,
            Basis: BasisBudgetPlan,
            CurrencyCode: currencyCode,
            CarryOver: carryOver,
            Dashboard: dashboard,
            Limitations: limitations));
    }

    /// <summary>
    /// Estimated full carry-over: the current open month's live final balance,
    /// floored at zero, so a negative current balance never rolls forward as a
    /// negative carry-over. Always flagged non-final — only the close snapshot
    /// fixes the real figure. Reads the already-materialised open month; writes
    /// nothing.
    /// </summary>
    private async Task<NextMonthPreviewCarryOverDto> EstimateCarryOverAsync(
        Guid fromBudgetMonthId,
        decimal? fromMonthCarryOverAmount,
        CancellationToken ct)
    {
        var liveData = await _monthDashRepo.GetDashboardDataForMonthAsync(fromBudgetMonthId, ct);
        if (liveData is null)
            return new NextMonthPreviewCarryOverDto(CarryModeNone, 0m, CarrySourceNone, IsFinal: false);

        var live = _projector.Project(liveData, fromMonthCarryOverAmount ?? 0m);
        var estimated = Math.Max(live.FinalBalanceWithCarryMonthly, 0m);

        return new NextMonthPreviewCarryOverDto(
            Mode: CarryModeEstimatedFull,
            Amount: estimated,
            Source: CarrySourceCurrentMonthLiveFinalBalance,
            IsFinal: false);
    }

    private static Result<NextMonthPreviewDto> Unavailable(
        string fromYearMonth,
        string previewYearMonth,
        string currencyCode) =>
        Result<NextMonthPreviewDto>.Success(new NextMonthPreviewDto(
            FromYearMonth: fromYearMonth,
            PreviewYearMonth: previewYearMonth,
            State: StateUnavailable,
            Basis: BasisBudgetPlan,
            CurrencyCode: currencyCode,
            CarryOver: new NextMonthPreviewCarryOverDto(CarryModeNone, 0m, CarrySourceNone, IsFinal: false),
            Dashboard: null,
            Limitations: new List<string> { LimitationFromOpenMonthOnly }));
}
