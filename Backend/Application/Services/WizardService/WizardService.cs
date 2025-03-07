using Backend.Application.Interfaces.WizardService;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Backend.Domain.Entities.Wizard;
using Backend.Application.DTO.Wizard;
using Backend.Application.DTO.Wizard.Steps;
using Newtonsoft.Json;
using FluentValidation;
using FluentValidation.Results;
using Newtonsoft.Json.Serialization;

namespace Backend.Application.Services.WizardService
{
    public class WizardService : IWizardService
    {
        private readonly IWizardSqlProvider _wizardProvider;
        private readonly IValidator<StepBudgetInfoDto> _stepValidator;
        private readonly ILogger<WizardService> _logger;

        public WizardService(IWizardSqlProvider wizardProvider, IValidator<StepBudgetInfoDto> stepValidator, ILogger<WizardService> logger)
        {
            _wizardProvider = wizardProvider;
            _stepValidator = stepValidator;
            _logger = logger;
            
        }
        public async Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(string email)
        {
            Guid wizardSessionId = await _wizardProvider.WizardSqlExecutor.CreateWizardAsync(email);
            if (wizardSessionId == Guid.Empty)
            {
                return (false, wizardSessionId, "Failed to create wizard session.");
            }
            return (true, wizardSessionId, "Wizard session created successfully.");
        }

        public async Task<bool> SaveStepDataAsync(string wizardSessionId, int stepNumber, object stepData)
        {
            string jsonData = string.Empty;
            _logger.LogInformation("Saving step {StepNumber} data for session {WizardSessionId}", stepNumber, wizardSessionId);

            switch (stepNumber)
            {
                case 1:
                    // Deserialize step data into a strongly typed DTO for Step 1
                    StepBudgetInfoDto budgetDto;
                    try
                    {
                        budgetDto = JsonConvert.DeserializeObject<StepBudgetInfoDto>(stepData.ToString());
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Deserialization failed for step {StepNumber}", stepNumber);
                        throw new Exception("Invalid data format for step 1.");
                    }

                    // Post-deserialization processing:
                    // (Filter or clear empty collections as needed)
                    budgetDto.HouseholdMembers = budgetDto.HouseholdMembers?.Where(m => !string.IsNullOrWhiteSpace(m.Name) || !string.IsNullOrWhiteSpace(m.Income?.ToString())).ToList()
                                                      ?? new List<HouseholdMemberDto>();
                    budgetDto.SideHustles = budgetDto.SideHustles?.Where(s => !string.IsNullOrWhiteSpace(s.Name) || !string.IsNullOrWhiteSpace(s.Income?.ToString())).ToList()
                                                      ?? new List<SideHustleDto>();

                    // Validate the DTO
                    ValidationResult result = _stepValidator.Validate(budgetDto);
                    if (!result.IsValid)
                    {
                        string errorMsg = string.Join("; ", result.Errors.Select(e => e.ErrorMessage));
                        _logger.LogError("Validation failed for step {StepNumber}: {Errors}", stepNumber, errorMsg);
                        throw new Exception("Validation failed: " + errorMsg);
                    }

                    // Re-serialize the validated DTO to JSON using camelCase settings.
                    jsonData = JsonConvert.SerializeObject(budgetDto, new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
                    break;

                /* PlaceHolder for additional steps
                case 2:
                    // For example, if Step 2 has its own validator:
                    var personalInfoDto = JsonConvert.DeserializeObject<StepPersonalInfoDto>(stepData.ToString());
                    var personalResult = _personalValidator.Validate(personalInfoDto);
                    if (!personalResult.IsValid)
                    {
                        string errorMsg = string.Join("; ", personalResult.Errors.Select(e => e.ErrorMessage));
                        _logger.LogError("Validation failed for step {StepNumber}: {Errors}", stepNumber, errorMsg);
                        throw new Exception("Validation failed: " + errorMsg);
                    }
                    jsonData = JsonConvert.SerializeObject(personalInfoDto);
                    break;

                // Continue for other steps as needed
                default:
                    // If no validation is needed, simply serialize the stepData
                    jsonData = JsonConvert.SerializeObject(stepData);
                    break;
            }
                */
                // Upsert the (validated) JSON data in the repository
                default:
                    // For other steps, simply serialize the data
                    jsonData = JsonConvert.SerializeObject(stepData);
                    break;
            }

            // Upsert the (validated) JSON data in the DB
            var upsertSuccess = await _wizardProvider.WizardSqlExecutor.UpsertStepDataAsync(wizardSessionId, stepNumber, jsonData);
            if (!upsertSuccess)
            {
                _logger.LogError("Failed to save step data for session {WizardSessionId}, step {StepNumber}", wizardSessionId, stepNumber);
                return false;
            }
            _logger.LogInformation("Step {StepNumber} data saved for session {WizardSessionId}", stepNumber, wizardSessionId);
            return true;
        }

        public async Task<Guid> UserHasWizardSessionAsync(string email)
            => (await _wizardProvider.WizardSqlExecutor.GetWizardSessionIdAsync(email)) ?? Guid.Empty;

        public async Task<Dictionary<int, object>?> GetWizardDataAsync(string wizardSessionId)
        {
            _logger.LogInformation("Retrieving wizard data for session {WizardSessionId}", wizardSessionId);

            var stepDataJson = await _wizardProvider.WizardSqlExecutor.GetWizardStepDataAsync(wizardSessionId);

            if (stepDataJson == null)
            {
                _logger.LogWarning("No wizard data found for session {WizardSessionId}", wizardSessionId);
                return null;
            }
            _logger.LogInformation("Wizard data retrieved successfully for session {WizardSessionId}", wizardSessionId);
            return stepDataJson;
        }
    }
}
