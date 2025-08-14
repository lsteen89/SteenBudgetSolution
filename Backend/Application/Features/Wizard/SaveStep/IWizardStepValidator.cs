using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.SaveStep;
public interface IWizardStepValidator
{
    int StepNumber { get; }
    Result<string> ValidateAndSerialize(object stepData); // Returns the JSON string on success
}