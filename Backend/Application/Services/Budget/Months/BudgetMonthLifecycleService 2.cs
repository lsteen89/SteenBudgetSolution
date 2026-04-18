using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Features.Budgets.Months.Helpers;
using Backend.Application.DTO.Budget.Months;
namespace Backend.Application.BudgetMonths.Services;

public sealed class BudgetMonthLifecycleService : IBudgetMonthLifecycleService
{
    private readonly IBudgetMonthRepository _repo;
    private readonly IBudgetMonthMaterializer _materializer;
    private readonly ITimeProvider _clock;

    public BudgetMonthLifecycleService(
        IBudgetMonthRepository repo,
        IBudgetMonthMaterializer materializer,
        ITimeProvider clock)
    {
        _repo = repo;
        _materializer = materializer;
        _clock = clock;
    }

    public async Task<Result<EnsureBudgetMonthLifecycleResult>> EnsureAccessibleMonthAsync(
        Guid persoid,
        Guid actorPersoid,
        string? requestedYearMonth,
        CancellationToken ct)
    {
        var budgetId = await _repo.GetBudgetIdByPersoidAsync(persoid, ct);
        if (budgetId is null)
        {
            return Result<EnsureBudgetMonthLifecycleResult>.Failure(
                new Error("Budget.NotFound", "No budget found for current user."));
        }

        var now = _clock.UtcNow;
        var currentYm = YearMonthUtil.CurrentYearMonth(now);

        var targetYm = string.IsNullOrWhiteSpace(requestedYearMonth)
            ? currentYm
            : requestedYearMonth.Trim();

        if (!YearMonthUtil.IsValid(targetYm))
        {
            return Result<EnsureBudgetMonthLifecycleResult>.Failure(
                new Error("BudgetMonth.InvalidYearMonth", "YearMonth must be in format YYYY-MM."));
        }
        var hasAnyMonths = await _repo.HasAnyMonthsAsync(budgetId.Value, ct);
        var wasBootstrapped = false;

        if (!hasAnyMonths)
        {
            await _repo.InsertOpenMonthIdempotentAsync(
                id: Guid.NewGuid(),
                budgetId: budgetId.Value,
                yearMonth: currentYm,
                carryOverMode: BudgetMonthCarryOverModes.None,
                carryOverAmount: null,
                userId: actorPersoid,
                nowUtc: now,
                ct: ct);

            wasBootstrapped = true;
        }



        var existing = await _repo.GetByBudgetIdAndYearMonthAsync(budgetId.Value, targetYm, ct);
        var wasCreated = false;

        if (existing is null)
        {
            await _repo.InsertOpenMonthIdempotentAsync(
                id: Guid.NewGuid(),
                budgetId: budgetId.Value,
                yearMonth: targetYm,
                carryOverMode: BudgetMonthCarryOverModes.None,
                carryOverAmount: null,
                userId: actorPersoid,
                nowUtc: now,
                ct: ct);

            wasCreated = true;

            existing = await _repo.GetByBudgetIdAndYearMonthAsync(budgetId.Value, targetYm, ct);
            if (existing is null)
            {
                return Result<EnsureBudgetMonthLifecycleResult>.Failure(
                    new Error("BudgetMonth.EnsureFailed", "Could not ensure requested budget month."));
            }
        }

        var materialized = await _materializer.MaterializeIfMissingAsync(
            budgetId.Value,
            existing.Id,
            actorPersoid,
            ct);

        if (materialized.IsFailure)
        {
            return Result<EnsureBudgetMonthLifecycleResult>.Failure(materialized.Error);
        }

        return Result<EnsureBudgetMonthLifecycleResult>.Success(
            new EnsureBudgetMonthLifecycleResult
            {
                BudgetId = budgetId.Value,
                BudgetMonthId = existing.Id,
                YearMonth = existing.YearMonth,
                WasCreated = wasCreated,
                WasBootstrapped = wasBootstrapped,
                WasMaterialized = materialized.Value
            });
    }
}