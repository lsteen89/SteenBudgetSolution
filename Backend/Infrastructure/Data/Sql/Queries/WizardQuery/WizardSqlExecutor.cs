using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using System.Data.Common;
using Newtonsoft.Json;
using System.Data;

namespace Backend.Infrastructure.Data.Sql.Queries.WizardQuery
{
    public class WizardSqlExecutor : SqlBase, IWizardSqlExecutor
    {
        public WizardSqlExecutor(DbConnection connection, ILogger<WizardSqlExecutor> logger)
        : base(connection, logger)
        {

        }
        public async Task<Guid> CreateWizardAsync(string email)
        {
            try
            {
                Guid wizardSessionId = Guid.NewGuid();
                _logger.LogInformation("Creating new wizard session {WizardSessionId} for user {Email}", wizardSessionId, email);

                string sqlQuery = @"
                INSERT INTO WizardSession (WizardSessionId, Email, CurrentStep, CreatedAt)
                VALUES (@WizardSessionId, @Email, @CurrentStep, @CreatedAt)";

                int rowsAffected = await ExecuteAsync(sqlQuery, new
                {
                    WizardSessionId = wizardSessionId,
                    Email = email,
                    CurrentStep = 0,
                    CreatedAt = DateTime.UtcNow
                });

                if (rowsAffected > 0)
                {
                    _logger.LogInformation("Wizard session {WizardSessionId} created successfully.", wizardSessionId);
                    return wizardSessionId;
                }
                else
                {
                    _logger.LogError("Failed to create wizard session for user {Email}", email);
                    return Guid.Empty;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while creating wizard session for user {Email}", email);
                return Guid.Empty;
            }
        }

        public async Task<Guid?> GetWizardSessionIdAsync(string email)
        {
            string sqlQuery = @"
            SELECT WizardSessionId
            FROM WizardSession
            WHERE Email = @Email";

            Guid? sessionId = await ExecuteScalarAsync<Guid?>(sqlQuery, new { Email = email });
            return sessionId;
        }
        public async Task<bool> UpsertStepDataAsync(string wizardSessionId, int stepNumber, string jsonData)
        {
            try
            {
                string sql = @"
            INSERT INTO WizardStep (WizardSessionId, StepNumber, StepData, UpdatedAt)
            VALUES (@WizardSessionId, @StepNumber, @StepData, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE 
                StepData = @StepData,
                UpdatedAt = UTC_TIMESTAMP();";

                int rowsAffected = await ExecuteAsync(sql, new
                {
                    WizardSessionId = wizardSessionId,
                    StepNumber = stepNumber,
                    StepData = jsonData
                });

                if (rowsAffected <= 0)
                {
                    _logger.LogError("Failed to upsert wizard step data for session {WizardSessionId}, step {StepNumber}", wizardSessionId, stepNumber);
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception while upserting wizard step data for session {WizardSessionId}, step {StepNumber}", wizardSessionId, stepNumber);
                return false;
            }
        }
        public async Task<string?> GetWizardDataAsync(string wizardSessionId)
        {
            const string query = @"
            SELECT StepData 
            FROM WizardStep  
            WHERE WizardSessionId = @WizardSessionId
            ORDER BY StepNumber ASC";

            try
            {
                return await QueryFirstOrDefaultAsync<string>(query, new { WizardSessionId = wizardSessionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error when retrieving wizard data for session {WizardSessionId}", wizardSessionId);
                throw;
            }
        }
    }
}
