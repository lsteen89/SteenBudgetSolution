using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.FinalizeWizard.Processors
{
    public interface IWizardStepProcessor
    {
        int StepNumber { get; }
        Task<Result> ProcessAsync(string stepData, Guid budgetId, CancellationToken ct);
    }
}
