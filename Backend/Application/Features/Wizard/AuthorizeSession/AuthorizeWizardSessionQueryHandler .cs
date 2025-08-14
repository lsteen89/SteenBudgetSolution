using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.AuthorizeSession;

public sealed class AuthorizeWizardSessionQueryHandler
    : IQueryHandler<AuthorizeWizardSessionQuery, bool>
{
    private readonly IWizardRepository _wizardRepository;

    public AuthorizeWizardSessionQueryHandler(IWizardRepository wizardRepository)
    {
        _wizardRepository = wizardRepository;
    }

    public async Task<bool> Handle(AuthorizeWizardSessionQuery request, CancellationToken ct)
    {
        // The user must be authenticated to own a session
        if (request.PersoId is null || request.PersoId.Value == Guid.Empty)
        {
            return false;
        }

        // Delegate the actual check to the repository
        return await _wizardRepository.DoesUserOwnSessionAsync(
            request.PersoId.Value,
            request.SessionId,
            ct);
    }
}