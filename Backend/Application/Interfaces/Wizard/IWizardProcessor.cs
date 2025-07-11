using Backend.Domain.Shared;

namespace Backend.Application.Interfaces.Wizard
{
    public interface IWizardProcessor
    {
        int StepNumber { get; set; } // Current step in the wizard process
        Task<OperationResult> ProcessAsync(string StepData); // Process the current step with provided data
    }
}
