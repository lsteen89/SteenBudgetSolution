using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebts;

public sealed class GetBudgetMonthDebtsQueryHandler
    : IRequestHandler<GetBudgetMonthDebtsQuery, Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthDebtMutationRepository _repo;

    public GetBudgetMonthDebtsQueryHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthDebtMutationRepository repo)
    {
        _lifecycle = lifecycle;
        _repo = repo;
    }

    public async Task<Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>> Handle(
        GetBudgetMonthDebtsQuery query,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            query.Persoid,
            query.Persoid,
            query.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(ensured.Error!);

        var meta = await _repo.GetBudgetMonthMetaAsync(ensured.Value.BudgetMonthId, ct);
        if (meta is null)
            return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Failure(BudgetMonth.NotFound);

        // PR 1.5: default editor read hides `ParticipationStatus = 'removed'`
        // and legacy `IsDeleted = 1` rows. Diagnostic/repair callers can still
        // opt in via the repository's `includeDeleted = true` parameter, but
        // the production editor UI must not surface removed rows.
        var rows = await _repo.GetDebtEditorRowsAsync(
            ensured.Value.BudgetMonthId,
            includeDeleted: false,
            ct);

        return Result<IReadOnlyList<BudgetMonthDebtEditorRowDto>>.Success(
            rows.Select(ToDto).ToList());
    }

    private static BudgetMonthDebtEditorRowDto ToDto(BudgetMonthDebtEditorRowReadModel row)
        => new(
            Id: row.Id,
            SourceDebtId: row.SourceDebtId,
            Name: row.Name ?? "",
            Type: row.Type,
            Balance: row.Balance,
            Apr: row.Apr,
            MonthlyFee: row.MonthlyFee,
            MinPayment: row.MinPayment,
            TermMonths: row.TermMonths,
            MonthlyPayment: row.MonthlyPayment,
            Status: row.Status,
            IsDeleted: row.IsDeleted,
            IsMonthOnly: row.SourceDebtId is null,
            CanUpdateDefault: row.SourceDebtId is not null);
}
