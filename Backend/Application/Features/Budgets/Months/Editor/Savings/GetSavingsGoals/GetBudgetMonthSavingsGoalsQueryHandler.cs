using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Savings;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.GetSavingsGoals;

public sealed class GetBudgetMonthSavingsGoalsQueryHandler
    : IRequestHandler<GetBudgetMonthSavingsGoalsQuery, Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;

    public GetBudgetMonthSavingsGoalsQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo)
    {
        _lifecycle = lifecycle;
        _repo = repo;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>> Handle(
        GetBudgetMonthSavingsGoalsQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(ensured.Error!);

        var meta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (meta is null)
            return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Failure(BudgetMonth.NotFound);

        var rows = await _repo.GetSavingsGoalEditorRowsAsync(
            ensured.Value.BudgetMonthId,
            includeDeleted: false,
            ct);

        return Result<IReadOnlyList<BudgetMonthSavingsGoalEditorRowDto>>.Success(
            rows.Select(ToDto).ToList());
    }

    private static BudgetMonthSavingsGoalEditorRowDto ToDto(BudgetMonthSavingsGoalEditorRowReadModel row)
    {
        var isClosed = string.Equals(row.Status, "closed", StringComparison.OrdinalIgnoreCase);
        var canUpdateDefault =
            row.SourceSavingsGoalId is not null &&
            !isClosed &&
            !row.IsDeleted;

        return new BudgetMonthSavingsGoalEditorRowDto(
            Id: row.Id,
            SourceSavingsGoalId: row.SourceSavingsGoalId,
            Name: row.Name ?? "",
            TargetAmount: row.TargetAmount,
            TargetDate: row.TargetDate,
            AmountSaved: row.AmountSaved,
            MonthlyContribution: row.MonthlyContribution,
            Status: row.Status,
            ClosedReason: row.ClosedReason,
            ClosedAt: row.ClosedAt,
            IsDeleted: row.IsDeleted,
            IsMonthOnly: row.SourceSavingsGoalId is null,
            CanUpdateDefault: canUpdateDefault);
    }
}
