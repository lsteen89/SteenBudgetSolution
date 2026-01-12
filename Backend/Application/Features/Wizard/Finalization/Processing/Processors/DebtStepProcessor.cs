using Backend.Application.DTO.Budget.Debt;

using Backend.Common.Utilities;
using Backend.Domain.Shared;
using System.Text.Json;
using Backend.Application.Features.Wizard.Finalization.Processing.Helpers;
using Backend.Application.Features.Wizard.Finalization.Abstractions;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Processors;

public sealed class DebtStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 4;

    private readonly ILogger<DebtStepProcessor> _logger;

    public DebtStepProcessor(ILogger<DebtStepProcessor> logger)
        => _logger = logger;

    public async Task<Result> ProcessAsync(string stepData, IWizardFinalizationTarget target, CancellationToken ct)
    {
        var failureMsg = FailureMsgHelper.GetFailureMessage(nameof(DebtStepProcessor));

        if (target is not IDebtTarget debtTarget)
            return Result.Failure(new Error("Wizard.TargetMissing", "Debt target not supported."));

        try
        {
            // STEP 1: DESERIALIZE
            var dto = JsonSerializer.Deserialize<DebtData>(stepData, JsonHelper.Camel);
            ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

            // STEP 2: APPLY (target decides: persist or preview)
            return await debtTarget.ApplyDebtAsync(dto, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON deserialization error in debt wizard step.");
            return Result.Failure(new Error("Debt.JsonError", "Invalid debt data format."));
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Deserialized debt data was null.");
            return Result.Failure(new Error("Debt.InvalidData", failureMsg));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in DebtStepProcessor.");
            return Result.Failure(new Error("Debt.InvalidData", failureMsg));
        }
    }
}
