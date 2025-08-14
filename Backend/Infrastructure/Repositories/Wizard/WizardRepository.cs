using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Entities.Wizard;
using Backend.Application.DTO.Wizard;
using Backend.Application.Models.Wizard;
using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Buffers;

namespace Backend.Infrastructure.Data.Repositories;

public class WizardRepository : SqlBase, IWizardRepository
{
    public WizardRepository(IUnitOfWork unitOfWork, ILogger<WizardRepository> logger)
        : base(unitOfWork, logger)
    {
    }

    public async Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct = default)
    {
        var wizardSessionId = Guid.NewGuid();

        string sql = @"
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt)
            VALUES (@WizardSessionId, @Persoid, @CurrentStep, @CreatedAt)";

        var parameters = new
        {
            WizardSessionId = wizardSessionId,
            Persoid = persoId,
            CurrentStep = 0,
            CreatedAt = DateTime.UtcNow
        };

        int rowsAffected = await ExecuteAsync(sql, parameters, ct);

        return rowsAffected > 0 ? wizardSessionId : Guid.Empty;
    }

    public Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct = default)
    {
        string sql = "SELECT WizardSessionId FROM WizardSession WHERE Persoid = @Persoid";
        return QueryFirstOrDefaultAsync<Guid?>(sql, new { Persoid = persoId }, ct);
    }
    public async Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, CancellationToken ct = default)
    {
        const string sql = @"
            INSERT INTO WizardStepData (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedAt, UpdatedAt)
            VALUES (@WizardSessionId, @StepNumber, @SubStep, @JsonData, @DataVersion, @Now, @Now)
            ON DUPLICATE KEY UPDATE 
            StepData = VALUES(StepData), 
            DataVersion = VALUES(DataVersion), 
            UpdatedAt = VALUES(UpdatedAt);";

        var parameters = new
        {
            WizardSessionId = wizardSessionId,
            StepNumber = stepNumber,
            SubStep = substepNumber,
            JsonData = jsonData,
            DataVersion = dataVersion,
            Now = DateTime.UtcNow
        };

        var rowsAffected = await ExecuteAsync(sql, parameters, ct);
        return rowsAffected > 0;
    }
    public async Task<bool> DoesUserOwnSessionAsync(Guid PersoId, Guid sessionId, CancellationToken ct = default)
    {
        // A lightweight query that just checks for existence.
        const string sql = @"
            SELECT EXISTS (
                SELECT 1 
                FROM WizardSession 
                WHERE WizardSessionId = @SessionId AND Persoid = @PersoId
            )";

        var parameters = new { SessionId = sessionId, PersoId = PersoId };

        return await ExecuteScalarAsync<bool>(sql, parameters, ct);
    }
    public async Task<WizardSavedDataDTO?> GetWizardDataAsync(Guid sessionId, CancellationToken ct = default)
    {
        var raw = await GetRawWizardStepDataAsync(sessionId, ct);
        if (!raw.Any())
        {
            return null;
        }

        // 1. Group the raw data to get the latest version of each sub-step
        var latestRows = raw
            .GroupBy(e => new { e.StepNumber, e.SubStep })
            .Select(g => g.OrderByDescending(e => e.UpdatedAt).First())
            .ToLookup(r => r.StepNumber);

        int highestVersion = latestRows.SelectMany(l => l).Max(r => r.DataVersion);
        var data = new WizardData();

        // 2. Assemble the data for each major step
        if (latestRows.Contains(1)) data.Income = AssembleStepData<IncomeFormValues>(latestRows[1]);
        if (latestRows.Contains(2)) data.Expenditure = AssembleStepData<ExpenditureFormValues>(latestRows[2], isMultiPart: true);
        if (latestRows.Contains(3)) data.Savings = AssembleStepData<SavingsFormValues>(latestRows[3], isMultiPart: true);
        if (latestRows.Contains(4)) data.Debts = AssembleStepData<DebtsFormValues>(latestRows[4], isMultiPart: true);

        // 3. Get the most recent sub-step number
        int subStep = await GetCurrentSubStepAsync(sessionId, ct);

        // 4. Package everything into the final DTO
        return new WizardSavedDataDTO
        {
            WizardData = data,
            DataVersion = highestVersion,
            SubStep = subStep
        };
    }
    public async Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT StepNumber, StepData, UpdatedAt 
            FROM WizardStepData 
            WHERE WizardSessionId = @SessionId";

        return await QueryAsync<WizardStepRowEntity>(sql, new { SessionId = sessionId }, ct);
    }
    #region Helper Methods
    // --- Private Helper Methods ---
    private async Task<IEnumerable<WizardStepRowEntity>> GetRawWizardStepDataAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = @"
            SELECT StepNumber, SubStep, StepData, DataVersion, UpdatedAt 
            FROM WizardStepData 
            WHERE WizardSessionId = @SessionId";
        return await QueryAsync<WizardStepRowEntity>(sql, new { SessionId = sessionId }, ct);
    }

    private Task<int> GetCurrentSubStepAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = @"
            SELECT SubStep FROM WizardStepData 
            WHERE WizardSessionId = @SessionId
            ORDER BY UpdatedAt DESC LIMIT 1";
        return QuerySingleOrDefaultAsync<int>(sql, new { SessionId = sessionId }, ct);
    }

    private T? AssembleStepData<T>(IEnumerable<WizardStepRowEntity> stepRows, bool isMultiPart = false)
    {
        if (!stepRows.Any())
            return default;

        if (!isMultiPart)
        {
            // For simple steps, just deserialize the newest entry
            return JsonSerializer.Deserialize<T>(stepRows.First().StepData, Camel);
        }
        else
        {
            // For complex steps, merge the JSON from all sub-steps
            var buffer = new ArrayBufferWriter<byte>();
            using var writer = new Utf8JsonWriter(buffer);

            writer.WriteStartObject();
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

            return JsonSerializer.Deserialize<T>(buffer.WrittenSpan, Camel);
        }
    }

    private static readonly JsonSerializerOptions Camel = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };
    #endregion

}