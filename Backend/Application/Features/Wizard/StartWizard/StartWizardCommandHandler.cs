using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using Backend.Domain.Entities.Wizard;

namespace Backend.Application.Features.Wizard.StartWizard;

public sealed class StartWizardCommandHandler : ICommandHandler<StartWizardCommand, Result<StartWizardResponse>>
{
    private readonly IWizardRepository _wizardRepository;
    private readonly ILogger<StartWizardCommandHandler> _logger;

    public StartWizardCommandHandler(IWizardRepository wizardRepository, ILogger<StartWizardCommandHandler> logger)
    {
        _wizardRepository = wizardRepository;
        _logger = logger;
    }

    public async Task<Result<StartWizardResponse>> Handle(StartWizardCommand request, CancellationToken ct)
    {
        var existingSessionId = await _wizardRepository.GetSessionIdByPersoIdAsync(request.PersoId, ct);
        Guid sessionId;
        if (existingSessionId.HasValue && existingSessionId.Value != Guid.Empty)
        {
            _logger.LogInformation("User {PersoId} already has wizard session {SessionId}", request.PersoId, existingSessionId.Value);
            sessionId = existingSessionId.Value;
        }

        else
        {
            _logger.LogInformation("Creating new wizard session for user {PersoId}", request.PersoId);
            var newSessionId = await _wizardRepository.CreateSessionAsync(request.PersoId, ct);

            if (newSessionId == Guid.Empty)
            {
                _logger.LogError("Failed to create wizard session for user {PersoId}", request.PersoId);
                return Result<StartWizardResponse>.Failure(new Error("Wizard.CreateFailed", "Failed to create wizard session."));
            }
            sessionId = newSessionId;
        }
        var response = new StartWizardResponse { WizardSessionId = sessionId };
        return Result<StartWizardResponse>.Success(response);
    }
}