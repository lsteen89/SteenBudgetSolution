using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.StartWizard;

public sealed record StartWizardCommand(Guid PersoId)
    : ICommand<Result<Guid>>, ITransactionalCommand;