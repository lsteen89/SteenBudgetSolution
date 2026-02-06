using Backend.Domain.Entities.Wizard;
namespace Backend.Application.Features.Wizard.GetWizardData.Abstractions;

public interface IWizardStepDataAssembler
{
    T? AssembleSingle<T>(IEnumerable<WizardStepRowEntity> rows);
    T? AssembleMulti<T>(IEnumerable<WizardStepRowEntity> rows);
}
