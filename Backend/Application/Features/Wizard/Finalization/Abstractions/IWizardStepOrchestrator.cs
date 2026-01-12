using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IWizardStepOrchestrator
{
    Task<Result> RunAsync(Guid sessionId, IWizardFinalizationTarget target, CancellationToken ct);
}