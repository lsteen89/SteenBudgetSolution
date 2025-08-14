using Backend.Application.DTO.Wizard;
using Backend.Domain.Shared;
using Backend.Application.Abstractions.Messaging;

namespace Backend.Application.Features.Wizard.GetWizardData;

public sealed record GetWizardDataQuery(Guid SessionId)
    : IQuery<Result<WizardSavedDataDTO?>>;