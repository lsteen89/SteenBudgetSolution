using Backend.Domain.Shared;
using System.Data;

namespace Backend.Application.Interfaces.Wizard
{
    public interface IWizardStepProcessor
    {
        int StepNumber { get; }
        Task<OperationResult> ProcessAsync(string stepData, Guid budgetId);
    }
}
