using Backend.Application.DTO.Budget;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Mapping;
using Backend.Domain.Abstractions;
using Backend.Domain.Entities.Budget.Expenditure;
using Backend.Domain.Interfaces.Repositories.Budget;
using Backend.Domain.Shared;
using Newtonsoft.Json;
using System.Data;

namespace Backend.Application.Services.WizardServices.Processors;

public sealed class IncomeStepProcessor : IWizardStepProcessor
{
    public int StepNumber => 1;                    

    private readonly IIncomeRepository _incomeRepository;
    private readonly ICurrentUserContext _currentUser;     
    private readonly ILogger<IncomeStepProcessor> _logger;

    public IncomeStepProcessor(
        IIncomeRepository incomeRepository,
        ICurrentUserContext currentUser,         
        ILogger<IncomeStepProcessor> logger)
    {
        _incomeRepository = incomeRepository;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<OperationResult> ProcessAsync(
        string stepData,
        Guid budgetId)
    {
        try
        {
            var dto = JsonConvert.DeserializeObject<IncomeData>(stepData);
            if (dto is null)
                return OperationResult.FailureResult("Failed to deserialize income step data.");

            
            var income = dto.ToDomain(
                persoid: _currentUser.Persoid,    
                createdBy: _currentUser.UserName);
            income.BudgetId = budgetId;

            await _incomeRepository.AddAsync(income, budgetId);

            return OperationResult.SuccessResult("Income step processed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing income step.");
            return OperationResult.FailureResult("An error occurred while processing the income step.");
        }
    }
}
