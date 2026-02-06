using Backend.Domain.Shared;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using System.Text.Json.Nodes;

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

        // 1) pick latest row per (step, substep)
        var latestPerSubStep = wizardData
            .GroupBy(x => (x.StepNumber, x.SubStep))
            .Select(g => g.OrderByDescending(x => x.UpdatedAt).First());

        // 2) merge substeps into one payload per step
        var mergedPerStep = latestPerSubStep
            .GroupBy(x => x.StepNumber)
            .Select(g => new
            {
                StepNumber = g.Key,
                StepData = MergeJsonObjects(
                    g.OrderBy(x => x.SubStep).Select(x => x.StepData)
                )
            })
            .OrderBy(x => x.StepNumber);

        foreach (var x in mergedPerStep)
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

    private static string MergeJsonObjects(IEnumerable<string> jsonParts)
    {
        var merged = new JsonObject();

        foreach (var json in jsonParts)
        {
            if (string.IsNullOrWhiteSpace(json)) continue;
            if (JsonNode.Parse(json) is not JsonObject obj) continue;

            foreach (var kv in obj)
                merged[kv.Key] = kv.Value?.DeepClone(); // last write wins
        }

        return merged.ToJsonString();
    }
}

