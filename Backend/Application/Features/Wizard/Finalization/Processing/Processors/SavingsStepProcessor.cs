using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;

using Backend.Common.Utilities;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Domain.Shared;
using System.Text.Json;
using Backend.Application.Features.Wizard.Finalization.Processing.Helpers;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Processors;

public sealed class SavingsStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 3;
    private readonly ILogger<SavingsStepProcessor> _logger;

    public SavingsStepProcessor(ILogger<SavingsStepProcessor> logger) => _logger = logger;

    public async Task<Result> ProcessAsync(string stepData, IWizardFinalizationTarget target, CancellationToken ct)
    {
        var failureMsg = FailureMsgHelper.GetFailureMessage(nameof(SavingsStepProcessor));

        if (target is not ISavingsTarget savingsTarget)
            return Result.Failure(new Error("Wizard.TargetMissing", "Savings target not supported."));

        try
        {
            var dto = JsonSerializer.Deserialize<SavingsData>(stepData, JsonHelper.Camel);
            ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

            // processor is now pure: validate + forward typed DTO
            return await savingsTarget.ApplySavingsAsync(dto, ct);

        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON deserialization error in SavingsStepProcessor.");
            return Result.Failure(new Error("Savings.JsonError", "Invalid savings data format."));
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Deserialized savings data was null.");
            return Result.Failure(new Error("Savings.InvalidData", failureMsg));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in SavingsStepProcessor.");
            return Result.Failure(new Error("Savings.InvalidData", failureMsg));
        }
    }
}


