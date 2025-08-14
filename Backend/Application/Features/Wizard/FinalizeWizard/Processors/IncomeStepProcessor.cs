using Backend.Application.DTO.Budget.Income;
using Backend.Application.Mappings.Budget;
using Backend.Application.Features.Wizard.FinalizeWizard.Processors.Helpers;
using Backend.Common.Utilities;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;
using System.Text.Json;

namespace Backend.Application.Features.Wizard.FinalizeWizard.Processors;

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



    public async Task<Result> ProcessAsync(string stepData, Guid budgetId, CancellationToken ct)
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
            await _incomeRepository.AddAsync(income, budgetId, ct);

            return Result.Success();
        }
        catch (JsonException ex) // Catches bad JSON
        {
            _logger.LogWarning(ex, "JSON deserialization error in IncomeStepProcessor for budget {BudgetId}.", budgetId);
            return Result.Failure(new Error("Income.JsonError", "Invalid income data format."));
        }
        catch (ArgumentNullException ex) // Catches the null check 
        {
            _logger.LogWarning(ex, "Deserialized income data was null for budget {BudgetId}.", budgetId);
            return Result.Failure(new Error("Income.InvalidData", FailureMsg));
        }
        catch (Exception ex) // Catches mapping, persistence, and any other unexpected thing
        {
            // This is our catch-all. The log message inside will tell us where it happened.
            // You could even inspect the exception's 'TargetSite' if you need more info.
            _logger.LogError(ex, "An error occurred in IncomeStepProcessor for budget {BudgetId}. See inner exception.", budgetId);
            return Result.Failure(new Error("Income.InvalidData", FailureMsg));
        }
    }
}
