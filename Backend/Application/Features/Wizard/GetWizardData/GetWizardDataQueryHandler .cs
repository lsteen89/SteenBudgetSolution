using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Wizard;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.GetWizardData;

public sealed class GetWizardDataQueryHandler
    : IQueryHandler<GetWizardDataQuery, Result<WizardSavedDataDTO?>>
{
    private readonly IWizardRepository _wizardRepository;

    public GetWizardDataQueryHandler(IWizardRepository wizardRepository)
    {
        _wizardRepository = wizardRepository;
    }

    public async Task<Result<WizardSavedDataDTO?>> Handle(GetWizardDataQuery request, CancellationToken ct)
    {
        var wizardData = await _wizardRepository.GetWizardDataAsync(request.SessionId, ct);
        return wizardData;
    }
}