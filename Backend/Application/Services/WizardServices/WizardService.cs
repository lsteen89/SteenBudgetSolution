using Backend.Application.DTO.Budget;
using Backend.Application.DTO.Wizard;
using Backend.Application.Interfaces.Wizard;
using Backend.Application.Interfaces.WizardService;
using Backend.Application.Models.Wizard;
using Backend.Domain.Entities.Wizard;
using Backend.Domain.Shared;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using FluentValidation;
using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Backend.Application.Services.WizardService
{
    public class WizardService : IWizardService
    {
        private readonly IWizardSqlProvider _wizardProvider;
        private readonly IValidator<IncomeFormValues> _incomeValidator;
        private readonly IValidator<ExpenditureFormValues> _expensesValidator;
        private readonly IValidator<SavingsFormValues> _savingsValidator;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<WizardService> _logger;
        private readonly ITransactionRunner _transactionRunner;
        private readonly IEnumerable<IWizardStepProcessor> _stepProcessors;

        public WizardService(
            IWizardSqlProvider wizardProvider,
            IValidator<IncomeFormValues> incomeValidator,
            IValidator<ExpenditureFormValues> expensesValidator,
            IValidator<SavingsFormValues> savingsValidator,
            IUnitOfWork unitOfWork,
            ILogger<WizardService> logger,
            ITransactionRunner transactionRunner,
            IEnumerable<IWizardStepProcessor> stepProcessors)
        {
            _wizardProvider = wizardProvider;
            _incomeValidator = incomeValidator;
            _expensesValidator = expensesValidator;
            _savingsValidator = savingsValidator;
            _unitOfWork = unitOfWork;
            _logger = logger;
            _transactionRunner = transactionRunner;
            _stepProcessors = stepProcessors;
        }
        #region create
        public async Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(Guid persoid)
        {
            Guid wizardSessionId = await _wizardProvider.WizardSqlExecutor.CreateWizardAsync(persoid);
            if (wizardSessionId == Guid.Empty)
            {
                return (false, wizardSessionId, "Failed to create wizard session.");
            }
            return (true, wizardSessionId, "Wizard session created successfully.");
        }
        #endregion
        #region Save

        public async Task<bool> SaveStepDataAsync(
                Guid wizardSessionId,
                int stepNumber,
                int substepNumber,
                object stepData,
                int dataVersion)
        {
            _logger.LogInformation("Saving step {Step}.{Sub} for {Session}",
                                   stepNumber, substepNumber, wizardSessionId);

            string jsonData;

            switch (stepNumber)
            {
                case 1:
                    jsonData = ValidateAndSerialize(stepData, _incomeValidator);
                    break;

                case 2:
                    jsonData = ValidateAndSerialize(stepData, _expensesValidator);
                    break;

                case 3:
                    jsonData = ValidateAndSerialize(stepData, _savingsValidator);
                    break;

                default:
                    jsonData = stepData.ToString()!;
                    break;
            }

            var ok = await _wizardProvider.WizardSqlExecutor.UpsertStepDataAsync(
                         wizardSessionId, stepNumber, substepNumber,
                         jsonData, dataVersion);

            if (!ok)
            {
                _logger.LogError("DB upsert failed for {Session}, step {Step}",
                                 wizardSessionId, stepNumber);
                return false;
            }

            _logger.LogInformation("Step {Step}.{Sub} saved (session {Session})",
                                   stepNumber, substepNumber, wizardSessionId);
            return true;
        }
        #endregion
        #region Finalize
        public async Task<OperationResult> FinalizeBudgetAsync(Guid sessionId)
        {
            var wizardData = await _wizardProvider.WizardSqlExecutor.GetRawWizardStepDataAsync(sessionId);
            if (wizardData == null || !wizardData.Any())
            {
                return OperationResult.FailureResult("No wizard data found to finalize.");
            }

            // 1. Generate the master Budget ID for this entire operation.
            var budgetId = Guid.NewGuid();
            _logger.LogInformation("Beginning budget finalization for new BudgetId: {BudgetId}", budgetId);

            try
            {
                // 2. Start the transaction via the Unit of Work.
                _unitOfWork.BeginTransaction();

                foreach (var stepData in wizardData.GroupBy(d => d.StepNumber))
                {
                    var processor = _stepProcessors.FirstOrDefault(p => p.StepNumber == stepData.Key);

                    if (processor == null)
                    {
                        // We must rollback before returning a failure.
                        _unitOfWork.Rollback();
                        return OperationResult.FailureResult($"No processor registered for step number {stepData.Key}.");
                    }

                    var latestStepData = stepData.OrderByDescending(s => s.UpdatedAt).First();

                    // 3. Call the ProcessAsync
                    // The processor and its repositories will now use the transaction from the UoW implicitly.
                    var result = await processor.ProcessAsync(latestStepData.StepData, budgetId);

                    if (!result.Success)
                    {
                        // The processor failed, so we roll everything back.
                        _unitOfWork.Rollback();
                        return result;
                    }
                }

                // 4. If all steps succeed, commit the entire transaction.
                _unitOfWork.Commit();
                _logger.LogInformation("Successfully finalized and committed BudgetId: {BudgetId}", budgetId);
                return OperationResult.SuccessResult("Budget finalized successfully.");
            }
            catch (Exception ex)
            {
                // 5. If any unexpected error occurs, roll everything back.
                _logger.LogError(ex, "A critical error occurred during finalization for BudgetId {BudgetId}. Rolling back transaction.", budgetId);
                _unitOfWork.Rollback();
                return OperationResult.FailureResult("An unexpected error occurred while finalizing the budget.");
            }
        }

        #endregion
        #region getters
        public async Task<WizardSavedDataDTO?> GetWizardDataAsync(Guid wizardSessionId)
        {
            // We get the whole package we need to send the data back to the client.
            var result = await AssembleWizardPackage(wizardSessionId);


            if (result == null)
            {
                _logger.LogWarning("No wizard data found for session {WizardSessionId}", wizardSessionId);
                return null;
            }

            // We retrieve the substep number from the database, which is the substep
            (WizardData data, int version) = result.Value;
            int? subStep = await GetWizardSubStep(wizardSessionId);

            // We return the assembled data in a DTO.
            return new WizardSavedDataDTO
            {
                WizardData = data,
                DataVersion = version,
                SubStep = subStep
            };
        }
        public async Task<Guid> UserHasWizardSessionAsync(Guid? persoid) =>
            (await _wizardProvider.WizardSqlExecutor.GetWizardSessionIdAsync(persoid)) ?? Guid.Empty;

        public async Task<int> GetWizardSubStep(Guid wizardSessionId) =>
            await _wizardProvider.WizardSqlExecutor.GetWizardSubStepAsync(wizardSessionId);
        public async Task<bool> GetWizardSessionAsync(Guid wizardSessionId)
        {
            WizardSessionDto? session;
            session = await _wizardProvider.WizardSqlExecutor.GetWizardSessionAsync(wizardSessionId);

            // Check if the session exists and belongs to this user
            bool userOwnsSession = UserOwnsSession(session, wizardSessionId);
            return userOwnsSession;

        }
        #endregion
        #region Step assembly
        // Assembles a whole wizard package from the substep data
        // Merges substep data into a single object for each step
        private async Task<(WizardData Data, int Version)?> AssembleWizardPackage(Guid wizardSessionId)
        {
            var raw = await _wizardProvider.WizardSqlExecutor.GetRawWizardStepDataAsync(wizardSessionId);
            if (!raw?.Any() ?? true) return null;

            // 1. We still keep the newest row for each (StepNumber, SubStep)
            var latestRows = raw
                .GroupBy(e => new { e.StepNumber, e.SubStep })
                .Select(g => g.OrderByDescending(e => e.UpdatedAt).First())
                .ToLookup(r => r.StepNumber);

            int highestVersion = latestRows.SelectMany(l => l).Max(r => r.DataVersion);
            var data = new WizardData();

            // STEP 1 – income (A simple step, with but one part)
            if (latestRows.Contains(1))
                data.Income = AssembleStepData<IncomeFormValues>(latestRows[1]);

            // STEP 2 – expenditure (A complex step, with many parts)
            if (latestRows.Contains(2))
                data.Expenditure = AssembleStepData<ExpenditureFormValues>(latestRows[2], isMultiPart: true);

            // STEP 3 – savings (Now correctly treated as a complex step!)
            if (latestRows.Contains(3))
                data.Savings = AssembleStepData<SavingsFormValues>(latestRows[3], isMultiPart: true);

            // Step 4 - Debts (A complex step, with many parts)
            if (latestRows.Contains(4))
                data.Debts = AssembleStepData<DebtsFormValues>(latestRows[4], isMultiPart: true);

            return (data, highestVersion);
        }
        private T? AssembleStepData<T>(IEnumerable<WizardStepRowEntity> stepRows, bool isMultiPart = false)
        {
            if (!stepRows.Any())
                return default;

            if (!isMultiPart)
            {
                // For simple steps like Step 1, we take the newest data and translate it directly.
                return JsonSerializer.Deserialize<T>(stepRows.First().StepData, Camel);
            }
            else
            {
                // For complex steps like 2 and 3, we must perform the great merge.
                var buffer = new System.Buffers.ArrayBufferWriter<byte>();
                using var writer = new Utf8JsonWriter(buffer);

                writer.WriteStartObject();

                // We take every piece of data for this step and merge their contents.
                foreach (var row in stepRows.OrderBy(r => r.SubStep))
                {
                    using var doc = JsonDocument.Parse(row.StepData);
                    foreach (var property in doc.RootElement.EnumerateObject())
                    {
                        property.WriteTo(writer);
                    }
                }

                writer.WriteEndObject();
                writer.Flush();

                // Once merged, the final translation can occur.
                return JsonSerializer.Deserialize<T>(buffer.WrittenSpan, Camel);
            }
        }

        #endregion
        #region helpers
        private bool UserOwnsSession(WizardSessionDto session, Guid wizardSessionId)
        {
            if (session == null)
            {
                // This is null when a session is not found in the database
                _logger.LogWarning("Session not found for wizard session ID {WizardSessionId}", wizardSessionId);
                return false;
            }

            return true;
        }
        private static readonly JsonSerializerOptions Camel = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Converters =
            {
                new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)
            }
        };
        private string ValidateAndSerialize<T>(
        object raw,
        IValidator<T> validator,
        Action<T>? postProcess = null) where T : class
        {
            var dto = JsonSerializer.Deserialize<T>(raw.ToString()!, Camel)
                      ?? throw new Exception($"Invalid JSON for type {typeof(T).Name}");

            postProcess?.Invoke(dto);
            validator.ValidateAndThrow(dto);

            return JsonSerializer.Serialize(dto, Camel);
        }

        #endregion
        #region cleaners
        private static void CleanIncome(IncomeFormValues v)
        {
            v.HouseholdMembers?
                .RemoveAll(m => string.IsNullOrWhiteSpace(m.Name) && !m.Income.HasValue);

            v.SideHustles?
                .RemoveAll(h => string.IsNullOrWhiteSpace(h.Name) && !h.Income.HasValue);
        }
        #endregion


    }
}