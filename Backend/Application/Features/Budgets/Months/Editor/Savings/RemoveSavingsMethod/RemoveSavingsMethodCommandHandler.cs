using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using MediatR;

namespace Backend.Application.Features.Budgets.Months.Editor.Savings.RemoveSavingsMethod;

// Removes the row only if it belongs to the caller's budget — the repository
// SQL joins on Savings.BudgetId so a stray id from another user can never
// match. Returns whether a row was actually removed; the editor treats `false`
// the same as success (it has already removed the chip locally and refetches).
public sealed class RemoveSavingsMethodCommandHandler
    : IRequestHandler<RemoveSavingsMethodCommand, Result<bool>>
{
    private readonly IBudgetMonthLifecycleService _lifecycle;
    private readonly IBudgetMonthSavingsGoalMutationRepository _repo;

    public RemoveSavingsMethodCommandHandler(
        IBudgetMonthLifecycleService lifecycle,
        IBudgetMonthSavingsGoalMutationRepository repo)
    {
        _lifecycle = lifecycle;
        _repo = repo;
    }

    public async Task<Result<bool>> Handle(
        RemoveSavingsMethodCommand cmd,
        CancellationToken ct)
    {
        var ensured = await _lifecycle.EnsureAccessibleMonthAsync(
            cmd.Persoid,
            cmd.Persoid,
            cmd.YearMonth,
            ct);

        if (ensured.IsFailure || ensured.Value is null)
            return Result<bool>.Failure(ensured.Error!);

        var rows = await _repo.DeleteSavingsMethodAsync(
            ensured.Value.BudgetId,
            cmd.SavingsMethodId,
            ct);

        return Result<bool>.Success(rows > 0);
    }
}
