namespace Backend.Application.Abstractions.Application.Orchestrators;

public interface IVerificationCodeOrchestrator
{
    Task EnqueueForNewUserAsync(Guid persoId, string email, CancellationToken ct);
    Task EnqueueForResendAsync(Guid persoId, string email, CancellationToken ct);
}
