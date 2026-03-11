using Backend.Domain.Shared;

namespace Backend.Application.Abstractions.Application.Orchestrators;

public interface IPasswordResetOrchestrator
{
    Task RequestResetAsync(string email, string? locale, CancellationToken ct);
    Task<Result> ResetAsync(string email, string code, string newPassword, CancellationToken ct);
}