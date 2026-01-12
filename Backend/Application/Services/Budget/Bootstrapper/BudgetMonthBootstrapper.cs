using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.DTO.Budget.Months;

namespace Backend.Application.Services.Budget.Bootstrapper;

public sealed class BudgetMonthBootstrapper : IBudgetMonthBootstrapper
{
    private readonly IBudgetMonthRepository _repo;
    private readonly ITimeProvider _clock;

    public BudgetMonthBootstrapper(IBudgetMonthRepository repo, ITimeProvider clock)
    {
        _repo = repo;
        _clock = clock;
    }

    public async Task EnsureFirstOpenMonthExistsAsync(Guid persoid, Guid actorPersoid, CancellationToken ct)
    {
        var budgetId = await _repo.GetBudgetIdByPersoidAsync(persoid, ct);
        if (budgetId is null) return;

        var hasAny = await _repo.HasAnyMonthsAsync(budgetId.Value, ct);
        if (hasAny) return;

        var now = _clock.UtcNow;
        var currentYm = YearMonthUtil.CurrentYearMonth(now);

        await _repo.InsertOpenMonthIdempotentAsync(
            id: Guid.NewGuid(),
            budgetId: budgetId.Value,
            yearMonth: currentYm,
            carryOverMode: BudgetMonthCarryOverModes.None,
            carryOverAmount: null,
            userId: actorPersoid,
            nowUtc: now,
            ct: ct);
    }
}
