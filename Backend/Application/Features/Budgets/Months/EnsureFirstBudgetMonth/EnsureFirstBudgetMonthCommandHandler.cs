using Backend.Application.Abstractions.Application.Services.Budget;
using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.EnsureFirstBudgetMonth;

public sealed class EnsureFirstBudgetMonthCommandHandler
    : ICommandHandler<EnsureFirstBudgetMonthCommand, Result>
{
    private readonly IBudgetMonthBootstrapper _bootstrapper;

    public EnsureFirstBudgetMonthCommandHandler(IBudgetMonthBootstrapper bootstrapper)
        => _bootstrapper = bootstrapper;

    public async Task<Result> Handle(EnsureFirstBudgetMonthCommand cmd, CancellationToken ct)
    {
        await _bootstrapper.EnsureFirstOpenMonthExistsAsync(cmd.Persoid, cmd.ActorPersoid, ct);
        return Result.Success();
    }
}
