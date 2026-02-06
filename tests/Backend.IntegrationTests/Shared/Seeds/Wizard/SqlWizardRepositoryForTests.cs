using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.DTO.Wizard;
using Backend.Domain.Entities.Wizard;
using Dapper;
using MySqlConnector;

namespace Backend.IntegrationTests.Shared.Wizard;

internal sealed class SqlWizardRepositoryForTests : IWizardRepository
{
    private readonly string _cs;

    public bool SimulateDeleteFailure { get; set; }

    public SqlWizardRepositoryForTests(string cs) => _cs = cs;

    public Task<Guid?> GetSessionIdByPersoIdAsync(Guid persoId, CancellationToken ct)
        => Task.FromResult<Guid?>(null);

    public Task<Guid> CreateSessionAsync(Guid persoId, CancellationToken ct)
        => Task.FromResult(Guid.Empty);

    public Task<bool> UpsertStepDataAsync(Guid wizardSessionId, int stepNumber, int substepNumber, string jsonData, int dataVersion, CancellationToken ct)
        => Task.FromResult(false);

    public Task<bool> DoesUserOwnSessionAsync(Guid userId, Guid sessionId, CancellationToken ct)
        => Task.FromResult(false);

    public Task<WizardSavedDataDto?> GetWizardDataAsync(Guid sessionId, CancellationToken ct)
        => Task.FromResult<WizardSavedDataDto?>(null);

    public async Task<IEnumerable<WizardStepRowEntity>> GetRawStepDataForFinalizationAsync(Guid sessionId, CancellationToken ct)
    {
        await using var c = new MySqlConnection(_cs);
        return await c.QueryAsync<WizardStepRowEntity>(
            """
            SELECT WizardSessionId, StepNumber, SubStep, StepData, DataVersion, UpdatedAt
            FROM WizardStepData
            WHERE WizardSessionId = @sid;
            """,
            new { sid = sessionId });
    }

    public async Task<bool> HasAnyStepDataAsync(Guid sessionId, CancellationToken ct)
    {
        await using var c = new MySqlConnection(_cs);
        var exists = await c.ExecuteScalarAsync<long>(
            "SELECT EXISTS(SELECT 1 FROM WizardStepData WHERE WizardSessionId = @sid LIMIT 1);",
            new { sid = sessionId });
        return exists == 1;
    }

    public async Task<bool> DeleteSessionAsync(Guid sessionId, CancellationToken ct)
    {
        if (SimulateDeleteFailure) return false;

        // If you want a real delete for some tests, enable it:
        // (If your schema has FK cascade you can simplify this)
        await using var c = new MySqlConnection(_cs);
        await c.OpenAsync(ct);

        await c.ExecuteAsync("DELETE FROM WizardStepData WHERE WizardSessionId = @sid;", new { sid = sessionId });
        var rows = await c.ExecuteAsync("DELETE FROM WizardSession WHERE WizardSessionId = @sid;", new { sid = sessionId });

        return rows > 0;
    }
    public async Task<IEnumerable<WizardStepRowEntity>> GetRawWizardStepDataAsync(Guid sessionId, CancellationToken ct)
    {
        await using var c = new MySqlConnection(_cs);
        return await c.QueryAsync<WizardStepRowEntity>(
            """
            SELECT StepNumber, SubStep, StepData, DataVersion, UpdatedAt 
            FROM WizardStepData 
            WHERE WizardSessionId = @SessionId";
            """,
            new { SessionId = sessionId });
    }

    public async Task<(int majorStep, int subStep)> GetCurrentStepAsync(Guid sessionId, CancellationToken ct)
    {
        const string sql = """
        SELECT StepNumber, SubStep 
        FROM WizardStepData 
        WHERE WizardSessionId = @SessionId
        ORDER BY UpdatedAt DESC 
        LIMIT 1
        """;

        using var connection = new MySqlConnection(_cs);

        // Query a specific DTO or the Entity to allow Dapper to map columns correctly
        var result = await connection.QueryFirstOrDefaultAsync<WizardStepRowEntity>(
            new CommandDefinition(sql, new { SessionId = sessionId }, cancellationToken: ct)
        );

        // Return a default or the mapped tuple
        return result == null ? (0, 0) : (result.StepNumber, result.SubStep);
    }
}
