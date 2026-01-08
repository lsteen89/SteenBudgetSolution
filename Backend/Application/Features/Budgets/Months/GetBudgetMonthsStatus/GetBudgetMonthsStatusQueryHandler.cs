using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.DTO.Budget.Months;
using Backend.Domain.Shared;


namespace Backend.Application.Features.Budgets.Months.GetBudgetMonthsStatus;

public sealed class GetBudgetMonthsStatusQueryHandler
    : IQueryHandler<GetBudgetMonthsStatusQuery, Result<BudgetMonthsStatusDto?>>
{
    private readonly IBudgetMonthRepository _repo;
    private readonly ITimeProvider _clock;

    public GetBudgetMonthsStatusQueryHandler(IBudgetMonthRepository repo, ITimeProvider clock)
    {
        _repo = repo;
        _clock = clock;
    }

    public async Task<Result<BudgetMonthsStatusDto?>> Handle(GetBudgetMonthsStatusQuery request, CancellationToken ct)
    {
        var budgetId = await _repo.GetBudgetIdByPersoidAsync(request.Persoid, ct);
        if (budgetId is null) return Result<BudgetMonthsStatusDto?>.Success(null);

        var now = _clock.UtcNow;
        var currentYm = YearMonthUtil.CurrentYearMonth(now);

        var months = await _repo.GetMonthsAsync(budgetId.Value, ct);

        var open = months
            .Where(m => m.Status == BudgetMonthStatuses.Open)
            .OrderByDescending(m => m.YearMonth)
            .ThenByDescending(m => m.OpenedAt)
            .FirstOrDefault();

        var suggested = SuggestAction(months.Count, open?.YearMonth, currentYm);

        var gapMonths = (open is null || open.YearMonth == currentYm)
            ? 0
            : Math.Max(0, YearMonthUtil.MonthsBetween(open.YearMonth, currentYm));

        var list = months
            .OrderByDescending(m => m.YearMonth)
            .Select(m => new BudgetMonthListItemDto(m.YearMonth, m.Status, m.OpenedAt, m.ClosedAt))
            .ToList();

        return Result<BudgetMonthsStatusDto?>.Success(new BudgetMonthsStatusDto(
            OpenMonthYearMonth: open?.YearMonth,
            CurrentYearMonth: currentYm,
            GapMonthsCount: gapMonths,
            Months: list,
            SuggestedAction: suggested
        ));
    }

    private static string SuggestAction(int monthsCount, string? openYm, string currentYm)
    {
        if (monthsCount == 0) return BudgetMonthSuggestedActions.CreateFirstMonth;
        if (openYm is null) return BudgetMonthSuggestedActions.PromptStartCurrent;
        if (openYm != currentYm) return BudgetMonthSuggestedActions.PromptStartCurrent;
        return BudgetMonthSuggestedActions.None;
    }
}
