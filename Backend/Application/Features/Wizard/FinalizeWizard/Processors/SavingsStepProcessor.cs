using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Mappings.Budget;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Features.Wizard.FinalizeWizard.Processors
{
    public class SavingsStepProcessor : IWizardStepProcessor
    {
        public int StepNumber => 3;

        private readonly ISavingsRepository _savingsRepository;
        private readonly ILogger<SavingsStepProcessor> _logger;

        public SavingsStepProcessor(ISavingsRepository savingsRepository, ILogger<SavingsStepProcessor> logger)
        {
            _savingsRepository = savingsRepository;
            _logger = logger;
        }

        public async Task<Result> ProcessAsync(string stepData, Guid budgetId, CancellationToken ct)
        {
            string FailureMsg = FailureMsgHelper.GetFailureMessage(nameof(SavingsStepProcessor));

            try
            {
                // STEP 1: DESERIALIZE 
                var savingsData = JsonSerializer.Deserialize<SavingsData>(stepData, JsonHelper.Camel);

                // If the data is garbage, we throw an exception. We don't return from the happy path.
                ArgumentNullException.ThrowIfNull(savingsData, nameof(stepData));

                // STEP 2: MAP TO DOMAIN
                var savings = savingsData.ToDomain(budgetId);

                // STEP 3: PERSIST
                await _savingsRepository.AddAsync(savings, budgetId, ct);

                // If we get here, the job is perfect.
                return Result.Success();
            }
            catch (JsonException ex) // For a badly wrapped package
            {
                _logger.LogWarning(ex, "JSON deserialization error in SavingsStepProcessor for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Savings.JsonError", "Invalid savings data format."));
            }
            catch (ArgumentNullException ex) // For an empty package
            {
                _logger.LogWarning(ex, "Deserialized savings data was null for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Savings.InvalidData", FailureMsg));
            }
            catch (Exception ex) // For any other screw-up along the way
            {
                _logger.LogError(ex, "An error occurred in SavingsStepProcessor for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Savings.InvalidData", FailureMsg));
            }
        }
    }
}
