using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;

namespace Backend.Application.Features.Wizard.Finalization.Orchestration;

public sealed class WizardStepOrchestrator : IWizardStepOrchestrator
{
    private readonly IWizardRepository _wizardRepository;
    private readonly IEnumerable<IWizardStepProcessor> _processors;

    public WizardStepOrchestrator(
        IWizardRepository wizardRepository,
        IEnumerable<IWizardStepProcessor> processors)
    {
        _wizardRepository = wizardRepository;
        _processors = processors;
    }

    public async Task<Result> RunAsync(Guid sessionId, IWizardFinalizationTarget target, CancellationToken ct)
    {
        var wizardData = await _wizardRepository.GetRawStepDataForFinalizationAsync(sessionId, ct);
        if (!wizardData.Any())
            return Result.Failure(new Error("Wizard.NoData", "No wizard data found."));

        // latest per step, then run in step order
        var latest = wizardData
            .GroupBy(x => (x.StepNumber, x.SubStep))
            .Select(g => g.OrderByDescending(x => x.UpdatedAt).First())
            .OrderBy(x => x.StepNumber)
            .ThenBy(x => x.SubStep);

        foreach (var x in latest)
        {
            var processor = _processors.FirstOrDefault(p => p.StepNumber == x.StepNumber);
            if (processor is null)
                return Result.Failure(new Error("Wizard.ProcessorNotFound", $"No processor for step {x.StepNumber}."));

            var res = await processor.ProcessAsync(x.StepData, target, ct);
            if (res.IsFailure)
                return res;
        }

        return Result.Success();
    }
}

