using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.AuthorizeSession;

public sealed record AuthorizeWizardSessionQuery(Guid? PersoId, Guid SessionId) : IQuery<bool>;