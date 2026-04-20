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
    private const string DayOfMonth = "dayOfMonth";
    private const string LastDayOfMonth = "lastDayOfMonth";

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

            var normalizeResult = NormalizePaymentDay(dto);
            if (normalizeResult.IsFailure)
                return normalizeResult;

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

    private static Result NormalizePaymentDay(IncomeData dto)
    {
        var normalizedType = string.IsNullOrWhiteSpace(dto.IncomePaymentDayType)
            ? null
            : dto.IncomePaymentDayType.Trim();

        var paymentDay = dto.IncomePaymentDay;

        if (normalizedType is null && paymentDay is null)
        {
            dto.IncomePaymentDayType = LastDayOfMonth;
            dto.IncomePaymentDay = null;
            return Result.Success();
        }

        if (normalizedType == DayOfMonth)
        {
            if (!paymentDay.HasValue)
            {
                return Result.Failure(new Error(
                    "Income.InvalidPaymentDay",
                    "Income payment day is required when payment day type is dayOfMonth."));
            }

            if (paymentDay is < 1 or > 28)
            {
                return Result.Failure(new Error(
                    "Income.InvalidPaymentDay",
                    "Income payment day must be between 1 and 28 when payment day type is dayOfMonth."));
            }

            dto.IncomePaymentDayType = DayOfMonth;
            dto.IncomePaymentDay = paymentDay;
            return Result.Success();
        }

        if (normalizedType == LastDayOfMonth)
        {
            if (paymentDay.HasValue)
            {
                return Result.Failure(new Error(
                    "Income.InvalidPaymentDay",
                    "Income payment day must be null when payment day type is lastDayOfMonth."));
            }

            dto.IncomePaymentDayType = LastDayOfMonth;
            dto.IncomePaymentDay = null;
            return Result.Success();
        }

        return Result.Failure(new Error(
            "Income.InvalidPaymentDayType",
            "Income payment day type is invalid."));
    }
}
