using Backend.Application.DTO.Budget.Income;
using Backend.Application.Mappings.Budget;
using Backend.Common.Utilities;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Domain.Shared;
using System.Text.Json;
using Backend.Application.Features.Wizard.Finalization.Processing.Helpers;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Processors;

public sealed class IncomeStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 1;
    private readonly ILogger<IncomeStepProcessor> _logger;

    public IncomeStepProcessor(ILogger<IncomeStepProcessor> logger) => _logger = logger;

    public async Task<Result> ProcessAsync(string stepData, IWizardFinalizationTarget target, CancellationToken ct)
    {
        var failureMsg = FailureMsgHelper.GetFailureMessage(nameof(IncomeStepProcessor));

        if (target is not IIncomeTarget incomeTarget)
            return Result.Failure(new Error("Wizard.TargetMissing", "Income target not supported."));

        try
        {
            var dto = JsonSerializer.Deserialize<IncomeData>(stepData, JsonHelper.Camel);
            ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

            return await incomeTarget.ApplyIncomeAsync(dto, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON deserialization error in IncomeStepProcessor.");
            return Result.Failure(new Error("Income.JsonError", "Invalid income data format."));
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Deserialized income data was null.");
            return Result.Failure(new Error("Income.InvalidData", failureMsg));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in IncomeStepProcessor.");
            return Result.Failure(new Error("Income.InvalidData", failureMsg));
        }
    }
}

