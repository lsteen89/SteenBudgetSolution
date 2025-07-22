using Backend.Application.DTO.Budget.Debt;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Mapping.Budget;
using Backend.Application.Services.WizardServices.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Services.WizardServices.Processors
{
    public class DebtStepProcessor : IWizardStepProcessor
    {
        public int StepNumber => 4;

        private readonly IDebtsRepository _debtsRepository;
        private readonly IBudgetRepository _budgetRepository;
        private readonly ILogger<DebtStepProcessor> _logger;

        public DebtStepProcessor(
            IDebtsRepository debtsRepository,
            IBudgetRepository budgetRepository,
            ILogger<DebtStepProcessor> logger)
            {
                
                _debtsRepository = debtsRepository; 
                _budgetRepository = budgetRepository;
                _logger = logger;
            }

        public async Task<OperationResult> ProcessAsync(
            string stepData,
            Guid budgetId)
        {
            // Make sure we have our consistent failure message
            string FailureMsg = FailureMsgHelper.GetFailureMessage(nameof(DebtStepProcessor));

            try
            {
                // STEP 1: DESERIALIZE
                var dto = JsonSerializer.Deserialize<DebtData>(stepData, JsonHelper.Camel);

                // If the data is garbage, we throw an exception. We don't return from the happy path.
                ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

                // STEP 2: MAP TO A COMPLETE DOMAIN OBJECT
                var debt = dto.ToDomain(budgetId);

                // STEP 3: PERSIST REPAYMENT STRATEGY
                if (debt.Strategy is not null)
                {
                    await _budgetRepository.UpdateRepaymentStrategyAsync(debt.Strategy.Value, budgetId);
                }

                // STEP 4: PERSIST DEBTS
                if (debt.Debts.Any())
                {
                    await _debtsRepository.AddDebtsAsync(debt.Debts, budgetId);
                }


                return OperationResult.SuccessResult("Debt step processed successfully.");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "JSON deserialization error in debt for budget {BudgetId}.", budgetId);
                return OperationResult.FailureResult(FailureMsg);
            }
            catch (ArgumentNullException ex)
            {
                _logger.LogWarning(ex, "Deserialized debt data was null for budget {BudgetId}.", budgetId);
                return OperationResult.FailureResult(FailureMsg);
            }
            catch (Exception ex)
            {
                // This is our final net. It catches database errors, mapping errors, whatever.
                // The real details are in the exception that the logger saves for us.
                _logger.LogError(ex, "An error occurred in DebtProcessor for budget {BudgetId}.", budgetId);
                return OperationResult.FailureResult(FailureMsg);
            }
        }
    }
}
