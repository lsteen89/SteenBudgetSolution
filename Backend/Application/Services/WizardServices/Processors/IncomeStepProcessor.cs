using Backend.Application.DTO.Budget.Income;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Mapping;
using Backend.Application.Mapping.Budget;
using Backend.Application.Services.WizardServices.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Services.WizardServices.Processors;

public sealed class IncomeStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 1;
    

    private readonly IIncomeRepository _incomeRepository;   
    private readonly ILogger<IncomeStepProcessor> _logger;

    public IncomeStepProcessor(
        IIncomeRepository incomeRepository,     
        ILogger<IncomeStepProcessor> logger)
    {
        _incomeRepository = incomeRepository;
        _logger = logger;
    }

    

    public async Task<OperationResult> ProcessAsync(string stepData, Guid budgetId)
    {
        string FailureMsg = FailureMsgHelper.GetFailureMessage(nameof(IncomeStepProcessor));
        try
        {
            // STEP 1: DESERIALIZE 
            var dto = JsonSerializer.Deserialize<IncomeData>(stepData, JsonHelper.Camel);

            // If the data is garbage, we throw an exception. We don't return from the happy path.
            ArgumentNullException.ThrowIfNull(dto, nameof(stepData));

            // STEP 2: MAP TO DOMAIN
            var income = dto.ToDomain(budgetId);

            // STEP 3: PERSIST
            await _incomeRepository.AddAsync(income, budgetId);

            return OperationResult.SuccessResult("Income step processed successfully.");
        }
        catch (JsonException ex) // Catches bad JSON
        {
            _logger.LogWarning(ex, "JSON deserialization error in IncomeStepProcessor for budget {BudgetId}.", budgetId);
            return OperationResult.FailureResult(FailureMsg);
        }
        catch (ArgumentNullException ex) // Catches the null check 
        {
            _logger.LogWarning(ex, "Deserialized income data was null for budget {BudgetId}.", budgetId);
            return OperationResult.FailureResult(FailureMsg);
        }
        catch (Exception ex) // Catches mapping, persistence, and any other unexpected thing
        {
            // This is our catch-all. The log message inside will tell us where it happened.
            // You could even inspect the exception's 'TargetSite' if you need more info.
            _logger.LogError(ex, "An error occurred in IncomeStepProcessor for budget {BudgetId}. See inner exception.", budgetId);
            return OperationResult.FailureResult(FailureMsg);
        }
    }
}
