using Backend.Application.Interfaces.Wizard;
using Backend.Application.DTO.Wizard;
using Backend.Application.Interfaces.Repositories;
using Backend.Domain.Shared;

namespace Backend.Application.Services.WizardServices.Processors
{
    public class IncomeStepProcessor : IWizardProcessor
    {
        public int StepNumber => 1; // Income step is the first step in the wizard
        private readonly IIncomeRepository _incomeRepository; // Repository to handle income data

        public IncomeStepProcessor(IIncomeRepository incomeRepository)
        {
            _incomeRepository = incomeRepository;
        }
        public async Task<OperationResult> ProcessAsync(string stepData)
        {
            try
            {
                // Deserialize the step data into a model (assuming it's in JSON format)
                var incomeData = JsonConvert.DeserializeObject<IncomeDataModel>(stepData);

                if (incomeData == null)
                {
                    return OperationResult.FailureResult("Invalid income data provided.");
                }

                // Validate the income data (you can add more validation logic as needed)
                if (string.IsNullOrEmpty(incomeData.Source) || incomeData.Amount <= 0)
                {
                    return OperationResult.FailureResult("Income source and amount must be valid.");
                }

                // Save the income data using the repository
                await _incomeRepository.SaveIncomeAsync(incomeData);

                return OperationResult.SuccessResult("Income data processed successfully.");
            }
            catch (Exception ex)
            {
                // Log the exception and return a failure result
                return OperationResult.FailureResult($"An error occurred while processing income data: {ex.Message}");
            }
        }
    }
}
