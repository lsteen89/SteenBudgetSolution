using Backend.Application.DTO.Wizard;
using Backend.Domain.Entities.Wizard;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IWizardRepository
{
    Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct);
    Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct);
    Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, CancellationToken ct);
    Task<bool> DoesUserOwnSessionAsync(Guid userId, Guid sessionId, CancellationToken ct);
    Task<WizardSavedDataDTO?> GetWizardDataAsync(Guid sessionId, CancellationToken ct);
    Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct);
}