using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Entities.Wizard;
using Backend.Application.DTO.Wizard;
using Backend.Application.Models.Wizard;
using System.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Buffers;
using Microsoft.Extensions.Options;
using Backend.Settings;


namespace Backend.Infrastructure.Data.Repositories;

public class WizardRepository : SqlBase, IWizardRepository
{
    public WizardRepository(IUnitOfWork unitOfWork, ILogger<WizardRepository> logger, IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db)
    {
    }

    public async Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct = default)
    {
        var wizardSessionId = Guid.NewGuid();

        string sql = @"
            INSERT INTO WizardSession (WizardSessionId, Persoid, CurrentStep, CreatedAt)
            VALUES (@WizardSessionId, @Persoid, @CurrentStep, UTC_TIMESTAMP())";

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
    public async Task<bool> HasAnyStepDataAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM WizardStepData WHERE WizardSessionId = @SessionId)";

        // Use the base class ExecuteScalarAsync for consistency
        return await ExecuteScalarAsync<bool>(sql, new { SessionId = sessionId }, ct);
    }
    public Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct = default)
    {
        string sql = "SELECT WizardSessionId FROM WizardSession WHERE Persoid = @Persoid";
        return QueryFirstOrDefaultAsync<Guid?>(sql, new { Persoid = persoId }, ct);
    }
    public async Task<bool> UpsertStepDataAsync(
        Guid wizardSessionId,
        int stepNumber,
        int substepNumber,
        string jsonData,
        int dataVersion,
        CancellationToken ct = default)
    {
        const string sql = @"
        INSERT INTO WizardStepData
            (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, CreatedBy, CreatedTime, UpdatedAt)
        VALUES
            (@WizardSessionId, @StepNumber, @SubStep, @JsonData, @DataVersion, @CreatedBy, @Now, @Now)
        ON DUPLICATE KEY UPDATE
            StepData   = VALUES(StepData),
            DataVersion= VALUES(DataVersion),
            UpdatedAt  = UTC_TIMESTAMP();";

        var parameters = new
        {
            WizardSessionId = wizardSessionId,
            StepNumber = stepNumber,
            SubStep = substepNumber,
            JsonData = jsonData,
            DataVersion = dataVersion,
            CreatedBy = "system",          // TODO: pass the current user (persoid) down and use it here
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

    public async Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct = default)
    {
        const string sql = @"
            SELECT WizardSessionId, StepNumber, SubStep, StepData, DataVersion, UpdatedAt
            FROM WizardStepData
            WHERE WizardSessionId = @sid;";

        return await QueryAsync<WizardStepRowEntity>(sql, new { sid = sessionId }, ct);
    }

    public async Task<IEnumerable<WizardStepRowEntity>> GetRawWizardStepDataAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = @"
            SELECT StepNumber, SubStep, StepData, DataVersion, UpdatedAt 
            FROM WizardStepData 
            WHERE WizardSessionId = @SessionId";
        return await QueryAsync<WizardStepRowEntity>(sql, new { SessionId = sessionId }, ct);
    }

    public Task<(int majorStep, int subStep)> GetCurrentStepAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = @"
            SELECT StepNumber, SubStep FROM WizardStepData 
            WHERE WizardSessionId = @SessionId
            ORDER BY UpdatedAt DESC LIMIT 1";
        return QuerySingleOrDefaultAsync<(int Step, int SubStep)>(sql, new { SessionId = sessionId }, ct);
    }
    #region Helper Methods
    // --- Private Helper Methods ---

    public async Task<bool> DeleteSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        const string sql = "DELETE FROM WizardSession WHERE WizardSessionId = @SessionId;";
        var rowsAffected = await ExecuteAsync(sql, new { SessionId = sessionId }, ct);
        return rowsAffected > 0;
    }
    #endregion

}