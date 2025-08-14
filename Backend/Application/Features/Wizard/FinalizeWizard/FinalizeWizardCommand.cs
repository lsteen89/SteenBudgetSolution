using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.FinalizeWizard;

public sealed record FinalizeWizardCommand(Guid SessionId, Guid UserId)
    : ICommand<Result>, ITransactionalCommand;