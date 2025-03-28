using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using Newtonsoft.Json;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Queries.WizardQuery
{
    public class WizardSqlExecutor : SqlBase, IWizardSqlExecutor
    {
        public WizardSqlExecutor(IConnectionFactory connectionFactory, ILogger<WizardSqlExecutor> logger)
        : base(connectionFactory, logger)
        {

        }
        public async Task<Guid> CreateWizardAsync(string email, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                Guid wizardSessionId = Guid.NewGuid();
                _logger.LogInformation("Creating new wizard session {WizardSessionId} for user {Email}", wizardSessionId, email);

                string sqlQuery = @"
            INSERT INTO WizardSession (WizardSessionId, Email, CurrentStep, CreatedAt)
            VALUES (@WizardSessionId, @Email, @CurrentStep, @CreatedAt)";

                int rowsAffected;
                if (conn != null)
                {
                    // Use provided connection (and transaction, if any)
                    rowsAffected = await ExecuteAsync(conn, sqlQuery, new
                    {
                        WizardSessionId = wizardSessionId,
                        Email = email,
                        CurrentStep = 0,
                        CreatedAt = DateTime.UtcNow
                    }, tx);
                }
                else
                {
                    // Open a new connection
                    using var localConn = await GetOpenConnectionAsync();
                    rowsAffected = await ExecuteAsync(localConn, sqlQuery, new
                    {
                        WizardSessionId = wizardSessionId,
                        Email = email,
                        CurrentStep = 0,
                        CreatedAt = DateTime.UtcNow
                    });
                }

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
        public async Task<Guid?> GetWizardSessionIdAsync(string email, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = @"
        SELECT WizardSessionId
        FROM WizardSession
        WHERE Email = @Email";

            Guid? sessionId;
            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                sessionId = await ExecuteScalarAsync<Guid?>(conn, sqlQuery, new { Email = email }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                sessionId = await ExecuteScalarAsync<Guid?>(localConn, sqlQuery, new { Email = email });
            }

            return sessionId;
        }
        public async Task<bool> UpsertStepDataAsync(
            string wizardSessionId,
            int stepNumber,
            string jsonData,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            try
            {
                string sql = @"
            INSERT INTO WizardStep (WizardSessionId, StepNumber, StepData, UpdatedAt)
            VALUES (@WizardSessionId, @StepNumber, @StepData, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE 
                StepData = @StepData,
                UpdatedAt = UTC_TIMESTAMP();";

                int rowsAffected;

                if (conn != null)
                {
                    // Use the provided connection and transaction (if any)
                    rowsAffected = await ExecuteAsync(conn, sql, new
                    {
                        WizardSessionId = wizardSessionId,
                        StepNumber = stepNumber,
                        StepData = jsonData
                    }, tx);
                }
                else
                {
                    // No connection provided—open a new connection.
                    using var localConn = await GetOpenConnectionAsync();
                    rowsAffected = await ExecuteAsync(localConn, sql, new
                    {
                        WizardSessionId = wizardSessionId,
                        StepNumber = stepNumber,
                        StepData = jsonData
                    });
                }

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
        public async Task<Dictionary<int, object>?> GetWizardStepDataAsync(
            string wizardSessionId,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            const string query = @"
        SELECT StepNumber, StepData 
        FROM WizardStep  
        WHERE WizardSessionId = @WizardSessionId
        ORDER BY StepNumber ASC";

            try
            {
                IEnumerable<WizardStepRow> stepDataRows;

                if (conn != null)
                {
                    // Use the provided connection and transaction.
                    stepDataRows = await QueryAsync<WizardStepRow>(conn, query, new { WizardSessionId = wizardSessionId }, tx);
                }
                else
                {
                    // No connection provided—open a new one.
                    using var localConn = await GetOpenConnectionAsync();
                    stepDataRows = await QueryAsync<WizardStepRow>(localConn, query, new { WizardSessionId = wizardSessionId });
                }

                if (stepDataRows == null || !stepDataRows.Any())
                {
                    _logger.LogWarning("No wizard data found for session {WizardSessionId}", wizardSessionId);
                    return null;
                }

                var result = new Dictionary<int, object>();

                foreach (var row in stepDataRows)
                {
                    // Deserialize using JObject to preserve structure.
                    var stepDataObject = JsonConvert.DeserializeObject<Newtonsoft.Json.Linq.JObject>(row.StepData);
                    _logger.LogInformation("Deserialized stepDataObject: {data}", stepDataObject.ToString());
                    result[row.StepNumber] = stepDataObject;
                    _logger.LogInformation("Row data: {StepData}", row.StepData);
                }

                _logger.LogInformation("Wizard data retrieved successfully for session {WizardSessionId}", wizardSessionId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error when retrieving wizard data for session {WizardSessionId}", wizardSessionId);
                throw;
            }
        }
        private class WizardStepRow
        {
            public int StepNumber { get; set; }
            public string StepData { get; set; }
        }

    }
}
