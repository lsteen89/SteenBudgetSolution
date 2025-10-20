using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.Common.Behaviors;

namespace Backend.Application.Features.Wizard.FinalizeWizard;

public sealed record FinalizeWizardCommand(Guid SessionId, Guid Persoid)
    : ICommand<Result>, ITransactionalCommand;