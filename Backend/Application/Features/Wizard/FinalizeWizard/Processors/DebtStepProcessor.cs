using Backend.Application.DTO.Budget.Debt;
using Backend.Application.Mappings.Budget;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Features.Wizard.FinalizeWizard.Processors
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

        public async Task<Result> ProcessAsync(
            string stepData,
            Guid budgetId,
            CancellationToken ct)
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
                    await _budgetRepository.UpdateRepaymentStrategyAsync(debt.Strategy.Value, budgetId, ct);
                }

                // STEP 4: PERSIST DEBTS
                if (debt.Debts.Any())
                {
                    await _debtsRepository.AddDebtsAsync(debt.Debts, budgetId, ct);
                }


                return Result.Success();
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "JSON deserialization error in debt for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Debt.JsonError", "Invalid debt data format."));
            }
            catch (ArgumentNullException ex)
            {
                _logger.LogWarning(ex, "Deserialized debt data was null for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Debt.InvalidData", FailureMsg));
            }
            catch (Exception ex)
            {
                // This is our final net. It catches database errors, mapping errors, whatever.
                // The real details are in the exception that the logger saves for us.
                _logger.LogError(ex, "An error occurred in DebtProcessor for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Debt.InvalidData", FailureMsg));
            }
        }
    }
}
