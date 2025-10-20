using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Domain.Entities.Wizard;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Wizard.StartWizard;

public sealed record StartWizardCommand(Guid PersoId)
    : ICommand<Result<StartWizardResponse>>, ITransactionalCommand;