using Backend.Application.DTO.Budget.Expenditure;

using Backend.Common.Utilities;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Domain.Shared;
using System.Text.Json;
using Backend.Application.Features.Wizard.Finalization.Processing.Helpers;

namespace Backend.Application.Features.Wizard.Finalization.Processing.Processors;

public sealed class ExpenseStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 2;

    private readonly ILogger<ExpenseStepProcessor> _logger;

    public ExpenseStepProcessor(ILogger<ExpenseStepProcessor> logger)
        => _logger = logger;

    public async Task<Result> ProcessAsync(string stepData, IWizardFinalizationTarget target, CancellationToken ct)
    {
        var failureMsg = FailureMsgHelper.GetFailureMessage(nameof(ExpenseStepProcessor));

        if (target is not IExpenditureTarget expenditureTarget)
            return Result.Failure(new Error("Wizard.TargetMissing", "Expenditure target not supported."));

        try
        {
            // STEP 1: DESERIALIZE
            var dto = JsonSerializer.Deserialize<ExpenditureData>(stepData, JsonHelper.Camel);
            ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

            // STEP 2: APPLY
            return await expenditureTarget.ApplyExpenditureAsync(dto, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "JSON deserialization error in expenditure wizard step.");
            return Result.Failure(new Error("Expenditure.JsonError", "Invalid expenditure data format."));
        }
        catch (ArgumentNullException ex)
        {
            _logger.LogWarning(ex, "Deserialized expenditure data was null.");
            return Result.Failure(new Error("Expenditure.InvalidData", failureMsg));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in ExpenseStepProcessor.");
            return Result.Failure(new Error("Expenditure.InvalidData", failureMsg));
        }
    }
}
