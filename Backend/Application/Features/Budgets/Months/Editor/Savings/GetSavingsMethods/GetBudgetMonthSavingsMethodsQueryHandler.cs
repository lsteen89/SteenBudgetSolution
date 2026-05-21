using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Entities.Budget.Savings;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsMethods;

// Returns plan-level savings methods (savings_account/isk/funds/cash/custom)
// for the user's budget so the savings editor can display them as context.
// Methods live on `Savings`, not on individual `SavingsGoal` rows — this
// query exposes a typed list with row identity so a future delete UI has
// stable targets. `customLabel` is only populated for `custom` rows; the
// DB CHECK constraint guarantees that pairing, but defensive filtering here
// drops any row whose code falls outside the known set (e.g. a stale row
// surviving a schema change) instead of throwing.
public sealed class GetBudgetMonthSavingsMethodsQueryHandler
    : IRequestHandler<GetBudgetMonthSavingsMethodsQuery, Result<IReadOnlyList<SavingsMethodDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;
    private readonly ILogger<GetBudgetMonthSavingsMethodsQueryHandler> _logger;

    public GetBudgetMonthSavingsMethodsQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo,
        ILogger<GetBudgetMonthSavingsMethodsQueryHandler> logger)
    {
        _lifecycle = lifecycle;
        _repo = repo;
        _logger = logger;
    }

    public async Task<Result<IReadOnlyList<SavingsMethodDto>>> Handle(
        GetBudgetMonthSavingsMethodsQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<SavingsMethodDto>>.Failure(ensured.Error!);

        // Methods are plan-level metadata (one `Savings` per `Budget`), so the
        // lookup is budget-scoped — the yearMonth only gates access via
        // EnsureAccessibleMonthAsync and never influences the result set.
        var rows = await _repo.GetSavingsMethodsAsync(ensured.Value.BudgetId, ct);

        var dtos = new List<SavingsMethodDto>(rows.Count);
        foreach (var row in rows)
        {
            if (!SavingsMethodCodes.IsKnown(row.MethodCode))
            {
                _logger.LogWarning(
                    "Skipping SavingsMethod row {RowId} with unknown code '{Code}' for budget {BudgetId}",
                    row.Id, row.MethodCode, ensured.Value.BudgetId);
                continue;
            }

            dtos.Add(ToDto(row));
        }

        return Result<IReadOnlyList<SavingsMethodDto>>.Success(dtos);
    }

    private static SavingsMethodDto ToDto(SavingsMethodReadModel row)
        => new(
            Id: row.Id,
            Code: row.MethodCode,
            CustomLabel: SavingsMethodCodes.IsCustom(row.MethodCode) ? row.CustomLabel : null);
}
