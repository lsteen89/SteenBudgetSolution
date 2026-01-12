using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Processors;

public interface IWizardStepProcessor
{
    int StepNumber { get; }
    Task<Result> ProcessAsync(string stepData, IWizardFinalizationTarget target, CancellationToken ct);
}

