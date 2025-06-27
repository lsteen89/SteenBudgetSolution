using Backend.Application.DTO.Wizard;
using Backend.Application.Interfaces.WizardService;
using Backend.Contracts.Wizard;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using FluentValidation;
using System.Buffers;
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
        private readonly ILogger<WizardService> _logger;

        public WizardService(
            IWizardSqlProvider wizardProvider,
            IValidator<IncomeFormValues> incomeValidator,
            IValidator<ExpenditureFormValues> expensesValidator,
            IValidator<SavingsFormValues> savingsValidator,
            ILogger<WizardService> logger)
        {
            _wizardProvider = wizardProvider;
            _incomeValidator = incomeValidator;
            _expensesValidator = expensesValidator;
            _savingsValidator = savingsValidator;
            _logger = logger;
        }
        public async Task<(bool IsSuccess, Guid WizardSessionId, string Message)> CreateWizardSessionAsync(Guid persoid)
        {
            Guid wizardSessionId = await _wizardProvider.WizardSqlExecutor.CreateWizardAsync(persoid);
            if (wizardSessionId == Guid.Empty)
            {
                return (false, wizardSessionId, "Failed to create wizard session.");
            }
            return (true, wizardSessionId, "Wizard session created successfully.");
        }

        public async Task<bool> SaveStepDataAsync(
                string wizardSessionId,
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
                    jsonData = ValidateAndSerialize(stepData, _incomeValidator, CleanIncome);
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
        public async Task<WizardSavedDataDTO?> GetWizardDataAsync(string wizardSessionId)
        {
            // We get the whole package we need to send the data back to the client.
            var result = await AssembleWizardPackage(wizardSessionId);


            if (result == null)
                return null;

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

        public async Task<int> GetWizardSubStep(string wizardSessionId) =>
            await _wizardProvider.WizardSqlExecutor.GetWizardSubStepAsync(wizardSessionId);
        public async Task<bool> GetWizardSessionAsync(string wizardSessionId)
        {
            WizardSessionDto? session;
            session = await _wizardProvider.WizardSqlExecutor.GetWizardSessionAsync(wizardSessionId);

            // Check if the session exists and belongs to this user
            bool userOwnsSession = UserOwnsSession(session, wizardSessionId);
            return userOwnsSession;

        }
        private bool UserOwnsSession(WizardSessionDto session, string wizardSessionId)
        {
            if(session == null)
            {
                // This is null when a session is not found in the database
                _logger.LogWarning("Session not found for wizard session ID {WizardSessionId}", wizardSessionId);
                return false;
            }

            return true;
        }

        // Assembles a whole wizard package from the substep data
        // Merges substep data into a single object for each step
        private async Task<(WizardData Data, int Version)?> AssembleWizardPackage(string sessionId)
        {
            var raw = await _wizardProvider.WizardSqlExecutor.GetRawWizardStepDataAsync(sessionId);
            if (!raw?.Any() ?? true) return null;

            // 1. keep the newest row for each (StepNumber, SubStep)
            var latestRows = raw
                .GroupBy(e => new { e.StepNumber, e.SubStep })
                .Select(g => g.OrderByDescending(e => e.UpdatedAt).First())
                .ToLookup(r => r.StepNumber);

            int highestVersion = latestRows.SelectMany(l => l).Max(r => r.DataVersion);
            var data = new WizardData();

            // STEP 1 – income (one sub-step only)
            if (latestRows.Contains(1))
                data.Income = JsonSerializer.Deserialize<IncomeFormValues>(
                    latestRows[1].First().StepData, Camel);

            // STEP 2 – expenditure (many sub-steps → merge)
            if (latestRows.Contains(2))
            {
                var buffer = new ArrayBufferWriter<byte>();        
                using var writer = new Utf8JsonWriter(buffer);     

                writer.WriteStartObject();

                foreach (var row in latestRows[2].OrderBy(r => r.SubStep))
                {
                    using var doc = JsonDocument.Parse(row.StepData);
                    foreach (var p in doc.RootElement.EnumerateObject())
                        p.WriteTo(writer);                        
                }

                writer.WriteEndObject();
                writer.Flush();                                     

                data.Expenditure = JsonSerializer.Deserialize<ExpenditureFormValues>(
                    buffer.WrittenSpan, Camel);                      
            }

            // STEP 3 – savings (similar to step 1)
            if (latestRows.Contains(3))
                data.Savings = JsonSerializer.Deserialize<SavingsFormValues>(
                    latestRows[3].First().StepData, Camel);

            return (data, highestVersion);
        }

        #region helpers
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
