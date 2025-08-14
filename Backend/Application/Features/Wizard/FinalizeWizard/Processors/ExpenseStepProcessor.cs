using Backend.Application.DTO.Budget.Expenditure;
using Backend.Application.Mappings.Budget;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Features.Wizard.FinalizeWizard.Processors
{
    public class ExpenseStepProcessor : IWizardStepProcessor
    {
        public int StepNumber => 2;

        private readonly IExpenditureRepository _expenditureRepository;
        private readonly ILogger<ExpenseStepProcessor> _logger;

        public ExpenseStepProcessor(
            IExpenditureRepository expenditureRepository,
            ILogger<ExpenseStepProcessor> logger)
        {
            _expenditureRepository = expenditureRepository;
            _logger = logger;
        }

        public async Task<Result> ProcessAsync(
            string stepData,
            Guid budgetId,
            CancellationToken ct)
        {
            // Make sure we have our consistent failure message
            string FailureMsg = FailureMsgHelper.GetFailureMessage(nameof(ExpenseStepProcessor));

            try
            {
                // STEP 1: DESERIALIZE
                var dto = JsonSerializer.Deserialize<ExpenditureData>(stepData, JsonHelper.Camel);

                // If the data is garbage, we throw an exception. We don't return from the happy path.
                ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

                // STEP 2: MAP TO A COMPLETE DOMAIN OBJECT
                // The DTO does its own job right.
                var expenditure = dto.ToUnifiedExpense(budgetId);

                // STEP 3: PERSIST
                await _expenditureRepository.AddAsync(expenditure, budgetId, ct);

                return Result.Success();
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "JSON deserialization error in ExpenditureProcessor for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Expenditure.JsonError", "Invalid expenditure data format."));
            }
            catch (ArgumentNullException ex)
            {
                _logger.LogWarning(ex, "Deserialized expenditure data was null for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Expenditure.InvalidData", FailureMsg));
            }
            catch (Exception ex)
            {
                // This is our final net. It catches database errors, mapping errors, whatever.
                // The real details are in the exception that the logger saves for us.
                _logger.LogError(ex, "An error occurred in ExpenditureProcessor for budget {BudgetId}.", budgetId);
                return Result.Failure(new Error("Expenditure.InvalidData", FailureMsg));
            }
        }
    }
}
