using Backend.Domain.Entities.Wizard;

namespace Backend.Application.Features.Wizard.GetWizardData.Abstractions;

public interface IWizardStepRowReducer
{
    ILookup<int, WizardStepRowEntity> Reduce(IEnumerable<WizardStepRowEntity> rawRows);
}
