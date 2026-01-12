namespace Backend.Application.Abstractions.Application.Services.Budget;

public interface IBudgetMonthBootstrapper
{
    Task EnsureFirstOpenMonthExistsAsync(Guid persoid, Guid actorPersoid, CancellationToken ct);
}
