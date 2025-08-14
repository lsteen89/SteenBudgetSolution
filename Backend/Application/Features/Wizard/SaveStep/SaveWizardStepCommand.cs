using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.SaveStep;

public sealed record SaveWizardStepCommand(
    Guid SessionId,
    int StepNumber,
    int SubStepNumber,
    object StepData,
    int DataVersion
) : ICommand<Result>;