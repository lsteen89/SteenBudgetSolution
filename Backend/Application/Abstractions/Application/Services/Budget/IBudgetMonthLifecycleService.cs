

using Backend.Domain.Shared;
namespace Backend.Application.Abstractions.Application.Services.Budget;

public sealed class EnsureBudgetMonthLifecycleResult
{
    public Guid BudgetId { get; init; }
    public Guid BudgetMonthId { get; init; }
    public string YearMonth { get; init; } = default!;
    public bool WasCreated { get; init; }
    public bool WasBootstrapped { get; init; }
    public bool WasMaterialized { get; init; }
}

public interface IBudgetMonthLifecycleService
{
    Task<Result<EnsureBudgetMonthLifecycleResult>> EnsureAccessibleMonthAsync(
        Guid persoid,
        Guid actorPersoid,
        string? requestedYearMonth,
        CancellationToken ct);
}