using Backend.Application.DTO.Budget;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Mapping;
using Backend.Domain.Shared;
using Newtonsoft.Json;
using System.Data;
using Backend.Domain.Abstractions;
using Backend.Domain.Interfaces.Repositories.Budget;

namespace Backend.Application.Services.WizardServices.Processors
{
    public class ExpenditureStepProcessor : IWizardStepProcessor
    {
        public int StepNumber => 2;

        private readonly IExpenditureRepository _expenditureRepository;
        private readonly ICurrentUserContext _currentUser;
        private readonly ILogger<ExpenditureStepProcessor> _logger;

        public ExpenditureStepProcessor(
            IExpenditureRepository expenditureRepository,
            ICurrentUserContext currentUser,
            ILogger<ExpenditureStepProcessor> logger)
        {
            _expenditureRepository = expenditureRepository;
            _currentUser = currentUser;
            _logger = logger;
        }

        public async Task<OperationResult> ProcessAsync(
            string stepData,
            Guid budgetId)
        {
            try
            {
                var dto = JsonConvert.DeserializeObject<ExpenditureData>(stepData);
                if (dto is null)
                    return OperationResult.FailureResult("Failed to deserialize expenditure step data.");

                var expenditure = dto.ToDomain();
                expenditure.BudgetId = budgetId;

                await _expenditureRepository.AddAsync(expenditure, budgetId);

                return OperationResult.SuccessResult("Expenditure step processed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing expenditure step.");
                return OperationResult.FailureResult("An error occurred while processing the expenditure step.");
            }
        }
    }
}
