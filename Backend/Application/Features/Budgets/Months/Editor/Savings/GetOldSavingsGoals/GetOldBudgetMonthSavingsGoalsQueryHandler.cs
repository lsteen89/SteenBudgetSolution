using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.GetOldSavingsGoals;

// Returns the "previous goals" archive for the savings editor: closed,
// undeleted month-level savings goals with a ClosedReason of 'completed' or
// 'cancelled'. 'removed' rows and any IsDeleted=1 rows are excluded
// server-side so the frontend never has to do reason-filtering. The active
// editor query (GetBudgetMonthSavingsGoalsQuery) remains active-only and is
// not touched.
public sealed class GetOldBudgetMonthSavingsGoalsQueryHandler
    : IRequestHandler<
        GetOldBudgetMonthSavingsGoalsQuery,
        Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly TimeProvider _timeProvider;

    public GetOldBudgetMonthSavingsGoalsQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        TimeProvider timeProvider)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _timeProvider = timeProvider;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>> Handle(
        GetOldBudgetMonthSavingsGoalsQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>.Failure(ensured.Error!);

        var meta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (meta is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>.Failure(BudgetMonth.NotFound);

        // Budget-scoped, not month-scoped — see SQL comment for why.
        // For a closed/skipped month being viewed historically, keep the
        // honest "as-of end of selected yearMonth" upper bound so a closure
        // in a later month does not leak into an earlier archive. For the
        // open month the user is editing, "now" is the right upper bound —
        // clamping to first-of-next-month silently drops goals closed today
        // when real wall-clock has crossed into the next calendar month
        // (closures write `nowUtc`, which can land past that bound).
        var (year, month) = YearMonthUtil.Parse(query.YearMonth);
        var isOpenMonth = string.Equals(
            meta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase);
        var upperBoundUtc = isOpenMonth
            ? _timeProvider.GetUtcNow().UtcDateTime.AddTicks(1)
            : new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);

        var rows = await _repo.GetSavingsGoalArchiveRowsAsync(
            ensured.Value.BudgetId,
            upperBoundUtc,
            ct);

        return Result<IReadOnlyList<BudgetMonthSavingsGoalArchiveRowDto>>.Success(
            rows.Select(ToDto).ToList());
    }

    private static BudgetMonthSavingsGoalArchiveRowDto ToDto(BudgetMonthSavingsGoalArchiveRowReadModel row)
        => new(
            Id: row.Id,
            SourceSavingsGoalId: row.SourceSavingsGoalId,
            Name: row.Name ?? "",
            TargetAmount: row.TargetAmount,
            TargetDate: row.TargetDate,
            AmountSavedAtClose: row.AmountSavedAtClose,
            MonthlyContribution: row.MonthlyContribution,
            Status: row.Status,
            ClosedReason: row.ClosedReason,
            ClosedAt: row.ClosedAt,
            IsMonthOnly: row.SourceSavingsGoalId is null);
}
