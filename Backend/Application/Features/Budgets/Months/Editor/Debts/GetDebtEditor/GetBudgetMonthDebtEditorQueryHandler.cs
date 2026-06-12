using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Application.Services.Debts;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;

// Debt PR 5: assembles the target editor read model from real backend
// state. The handler's only responsibilities are orchestration and shaping
// — every gating decision (permissions, group placement, progress
// emission) flows through `DebtEditorActionResolver` so the resolver tests
// can pin the contract without spinning up a database.
//
// Reads issued (in order):
//   1. `EnsureAccessibleMonthAsync` — runs materializer + returns
//      `BudgetMonthId`. Closed/skipped months still resolve, but
//      `MonthStatus != open` flips `IsReadOnly = true`.
//   2. `GetBudgetMonthMetaAsync` — used only to read the month's authoritative
//      `Status` for the readOnly flag (the lifecycle service may return an
//      ID but not the status string).
//   3. `GetDebtEditorAggregateRowsAsync` — month + source projection.
//   4. `GetDebtBalanceEventSourceAggregatesAsync` — keyed by `SourceDebtId`.
//   5. `GetDebtBalanceEventMonthAggregatesAsync` — keyed by `BudgetMonthDebtId`.
//   6. `GetDebtEditorRecentEventsAsync` — top-10 `BudgetMonthChangeEvent` rows
//      for debts in this month.
//
// Steps 3-6 are independent; we sequence them rather than parallelizing
// because every call uses the same Dapper connection from the ambient
// `UnitOfWork` and concurrent reads would deadlock the single MySQL
// connection. The cost is bounded — the aggregate queries are indexed
// (`IX_DebtBalanceEvent_DebtId_ChangedAt`, etc.) and capped by month size.
public sealed class GetBudgetMonthDebtEditorQueryHandler
    : IRequestHandler<GetBudgetMonthDebtEditorQuery, Result<BudgetMonthDebtEditorDto?>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;
    private readonly IDebtMonthlyPaymentBreakdownCalculator _breakdown;

    public GetBudgetMonthDebtEditorQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDebtMutationRepository repo,
        IDebtMonthlyPaymentBreakdownCalculator breakdown)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _breakdown = breakdown;
    }

    public async Task<Result<BudgetMonthDebtEditorDto?>> Handle(
        GetBudgetMonthDebtEditorQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<BudgetMonthDebtEditorDto?>.Failure(ensured.Error!);

        var budgetMonthId = ensured.Value.BudgetMonthId;

        var meta = await _repo.GetBudgetMonthMetaAsync(budgetMonthId, ct);
        if (meta is null)
            return Result<BudgetMonthDebtEditorDto?>.Failure(BudgetMonth.NotFound);

        var monthStatus = meta.Status;
        var isReadOnly = !BudgetMonthEditability.IsEditable(monthStatus);

        var rows = await _repo.GetDebtEditorAggregateRowsAsync(budgetMonthId, ct);

        // Collect non-empty key sets up front so the aggregate queries are
        // skipped entirely when there is nothing to look up.
        var sourceDebtIds = rows
            .Where(r => r.SourceDebtId is not null)
            .Select(r => r.SourceDebtId!.Value)
            .Distinct()
            .ToArray();
        var monthDebtIds = rows.Select(r => r.Id).ToArray();

        var sourceAggregates = await _repo.GetDebtBalanceEventSourceAggregatesAsync(sourceDebtIds, ct);
        var monthAggregates = await _repo.GetDebtBalanceEventMonthAggregatesAsync(monthDebtIds, ct);

        var sourceAggregateByKey = sourceAggregates.ToDictionary(a => a.Key, a => a);
        var monthAggregateByKey = monthAggregates.ToDictionary(a => a.Key, a => a);

        var recentEvents = await _repo.GetDebtEditorRecentEventsAsync(budgetMonthId, ct);

        var rowDtos = new List<DebtEditorRowDto>(rows.Count);

        // Summary accumulators. Built row-by-row using the precomputed
        // group so the resolver stays the single source of truth for
        // ledger placement.
        decimal includedPayments = 0m;
        decimal notIncludedPayments = 0m;
        decimal activeLiabilityBalance = 0m;
        decimal paidOffBalance = 0m;
        decimal archivedBalance = 0m;
        // Debt Polish PR 1: derived breakdown totals — explanatory only,
        // never replace `IncludedMonthlyPaymentTotal` in the dashboard equation.
        decimal includedInterest = 0m;
        decimal includedFee = 0m;
        decimal includedPrincipal = 0m;
        decimal projectedActiveLiabilityBalance = 0m;
        var rowsBelowInterestAndFees = 0;
        var includedCount = 0;
        var notIncludedCount = 0;
        var paidOffCount = 0;
        var archivedCount = 0;

        foreach (var row in rows)
        {
            var group = DebtEditorActionResolver.ResolveGroup(row);
            var (actions, reasons) = DebtEditorActionResolver.ResolveActions(row, isReadOnly, monthStatus);
            var progress = BuildProgress(row, sourceAggregateByKey, monthAggregateByKey);
            // Calculate breakdown for every row, using the payment that is
            // actually applied this month. For non-active rows
            // (skipped / paid / archived) no payment is applied — `Skipped`
            // intentionally keeps `MonthlyPayment` non-zero per PR 5's
            // "skip never zeroes the planned amount" contract — so the
            // breakdown for those rows must reflect reality: interest still
            // accrues (a real liability cost), fee still applies, but
            // principal is 0 and projected balance equals current balance.
            // Pinning `plannedMonthlyPayment` to 0 here is the single
            // source of that truth; the FE never has to re-derive it.
            var appliedPayment = group == BudgetMonthDebtEditorGroups.Active
                ? row.MonthlyPayment
                : 0m;
            var breakdown = _breakdown.Calculate(
                currentBalance: row.Balance,
                annualInterestPercent: row.Apr,
                monthlyFee: row.MonthlyFee,
                plannedMonthlyPayment: appliedPayment);

            rowDtos.Add(new DebtEditorRowDto(
                Id: row.Id,
                SourceDebtId: row.SourceDebtId,
                Name: row.Name ?? string.Empty,
                Type: row.Type,
                Balance: row.Balance,
                SourceBalance: row.SourceBalance,
                Apr: row.Apr,
                SourceApr: row.SourceApr,
                MonthlyFee: row.MonthlyFee,
                SourceMonthlyFee: row.SourceMonthlyFee,
                MinPayment: row.MinPayment,
                SourceMinPayment: row.SourceMinPayment,
                TermMonths: row.TermMonths,
                SourceTermMonths: row.SourceTermMonths,
                MonthlyPayment: row.MonthlyPayment,
                SourceMonthlyPayment: row.SourceMonthlyPayment,
                SourceLifecycleStatus: row.SourceLifecycleStatus,
                ParticipationStatus: row.ParticipationStatus,
                IsMonthOnly: row.SourceDebtId is null,
                IsRemoved: string.Equals(row.ParticipationStatus, BudgetMonthDebtParticipationStatuses.Removed, StringComparison.OrdinalIgnoreCase),
                SortOrder: row.SortOrder,
                Group: group,
                Progress: progress,
                PaymentBreakdown: breakdown,
                Actions: actions,
                DisabledReasons: reasons));

            // Summary bucketing matches `ResolveGroup`'s precedence exactly.
            switch (group)
            {
                case BudgetMonthDebtEditorGroups.Active:
                    includedPayments += row.MonthlyPayment;
                    activeLiabilityBalance += row.Balance;
                    // Breakdown totals come from `included` rows only.
                    // Projection applies their principal reduction.
                    includedInterest += breakdown.MonthlyInterest;
                    includedFee += breakdown.MonthlyFee;
                    includedPrincipal += breakdown.PrincipalPayment;
                    projectedActiveLiabilityBalance += breakdown.ProjectedBalanceAfterMonth;
                    if (!breakdown.CoversInterestAndFees) rowsBelowInterestAndFees++;
                    includedCount++;
                    break;
                case BudgetMonthDebtEditorGroups.Skipped:
                    notIncludedPayments += row.MonthlyPayment;
                    // `notIncluded` rows are still owed — they count in the
                    // active liability balance even though their payment
                    // does not count in monthly outflow. This mirrors the
                    // dashboard repo's `TotalDebtBalance` filter
                    // (`ParticipationStatus <> 'removed'`).
                    activeLiabilityBalance += row.Balance;
                    // No payment is applied to skipped rows this month, so
                    // the projected balance stays at the current balance.
                    projectedActiveLiabilityBalance += row.Balance;
                    notIncludedCount++;
                    break;
                case BudgetMonthDebtEditorGroups.Paid:
                    paidOffBalance += row.Balance;
                    paidOffCount++;
                    break;
                case BudgetMonthDebtEditorGroups.Archived:
                    archivedBalance += row.Balance;
                    archivedCount++;
                    break;
            }
        }

        var summary = new DebtEditorSummaryDto(
            IncludedMonthlyPaymentTotal: includedPayments,
            NotIncludedMonthlyPaymentTotal: notIncludedPayments,
            ActiveLiabilityBalanceTotal: activeLiabilityBalance,
            PaidOffBalanceTotal: paidOffBalance,
            ArchivedBalanceTotal: archivedBalance,
            IncludedMonthlyInterestTotal: includedInterest,
            IncludedMonthlyFeeTotal: includedFee,
            IncludedPrincipalPaymentTotal: includedPrincipal,
            ProjectedActiveLiabilityBalanceAfterMonth: projectedActiveLiabilityBalance,
            IncludedCount: includedCount,
            NotIncludedCount: notIncludedCount,
            PaidOffCount: paidOffCount,
            ArchivedCount: archivedCount,
            RowsBelowInterestAndFeesCount: rowsBelowInterestAndFees);

        var recentEventDtos = recentEvents
            .Select(e => new DebtEditorHistoryEventDto(
                Id: e.Id,
                EntityId: e.EntityId,
                SourceEntityId: e.SourceEntityId,
                EntityType: e.EntityType,
                ChangeType: e.ChangeType,
                Action: e.Action,
                ChangedAt: e.ChangedAt))
            .ToList();

        return Result<BudgetMonthDebtEditorDto?>.Success(
            new BudgetMonthDebtEditorDto(
                YearMonth: query.YearMonth,
                MonthStatus: monthStatus,
                IsReadOnly: isReadOnly,
                Summary: summary,
                Rows: rowDtos,
                RecentEvents: recentEventDtos));
    }

    /// <summary>
    /// Combines per-source and per-month-row balance-event aggregates into a
    /// single <see cref="DebtRowProgressDto"/>. Returns <c>null</c> when
    /// neither side has any events for this row — the FE treats null as
    /// "no real history; hide the bar".
    /// </summary>
    /// <remarks>
    /// Aggregates are disjoint by design (DDL constraint
    /// <c>CK_DebtBalanceEvent_Linkage</c>): a single event row is keyed to
    /// either a <c>DebtId</c> or a <c>BudgetMonthDebtId</c>, never both.
    /// When both aggregates are present we merge them by taking the earliest
    /// <c>FirstOldBalance</c>, latest <c>LastNewBalance</c>, summed
    /// <c>EventCount</c>, and outer bounds for the timestamps.
    /// </remarks>
    private static DebtRowProgressDto? BuildProgress(
        BudgetMonthDebtEditorAggregateReadModel row,
        IReadOnlyDictionary<Guid, DebtBalanceEventAggregateReadModel> sourceAggregateByKey,
        IReadOnlyDictionary<Guid, DebtBalanceEventAggregateReadModel> monthAggregateByKey)
    {
        DebtBalanceEventAggregateReadModel? sourceAgg = null;
        if (row.SourceDebtId is { } sourceId && sourceAggregateByKey.TryGetValue(sourceId, out var s))
            sourceAgg = s;

        monthAggregateByKey.TryGetValue(row.Id, out var monthAgg);

        if (sourceAgg is null && monthAgg is null)
            return null;

        // Earliest event across the two sides; explicit conditional keeps
        // the null handling readable.
        var firstAt = (sourceAgg, monthAgg) switch
        {
            (not null, not null) => sourceAgg.FirstEventAt < monthAgg.FirstEventAt ? sourceAgg.FirstEventAt : monthAgg.FirstEventAt,
            (not null, null)     => sourceAgg!.FirstEventAt,
            (null, not null)     => monthAgg!.FirstEventAt,
            _                    => DateTime.MinValue
        };

        var lastAt = (sourceAgg, monthAgg) switch
        {
            (not null, not null) => sourceAgg.LastEventAt > monthAgg.LastEventAt ? sourceAgg.LastEventAt : monthAgg.LastEventAt,
            (not null, null)     => sourceAgg!.LastEventAt,
            (null, not null)     => monthAgg!.LastEventAt,
            _                    => DateTime.MinValue
        };

        var firstOldBalance = (sourceAgg, monthAgg) switch
        {
            (not null, not null) => sourceAgg.FirstEventAt <= monthAgg.FirstEventAt
                ? sourceAgg.FirstOldBalance
                : monthAgg.FirstOldBalance,
            (not null, null)     => sourceAgg!.FirstOldBalance,
            (null, not null)     => monthAgg!.FirstOldBalance,
            _                    => 0m
        };

        var eventCount = (sourceAgg?.EventCount ?? 0) + (monthAgg?.EventCount ?? 0);

        var totalPaidDelta = firstOldBalance - row.Balance;
        decimal? percentPaid = firstOldBalance > 0m
            ? totalPaidDelta / firstOldBalance * 100m
            : null;

        return new DebtRowProgressDto(
            CurrentBalance: row.Balance,
            FirstBalance: firstOldBalance,
            TotalPaidDelta: totalPaidDelta,
            PercentPaid: percentPaid,
            EventCount: eventCount,
            FirstEventAt: firstAt,
            LastEventAt: lastAt);
    }
}
