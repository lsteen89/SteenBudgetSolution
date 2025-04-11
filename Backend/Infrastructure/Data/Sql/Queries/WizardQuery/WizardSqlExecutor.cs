﻿using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using Newtonsoft.Json;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using System.Data.Common;
using Dapper;
using Backend.Infrastructure.Entities.Wizard;

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
            int substepNumber,
            string jsonData,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            try
            {
                string sql = @"
            INSERT INTO WizardStep (WizardSessionId, StepNumber, SubStep, StepData, UpdatedAt)
            VALUES (@WizardSessionId, @StepNumber, @SubStep, @StepData, UTC_TIMESTAMP())
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
                        SubStep = substepNumber,
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
                        SubStep = substepNumber,
                        StepData = jsonData
                    });
                }

                if (rowsAffected <= 0)
                {
                    _logger.LogError("Failed to upsert wizard step data for session {WizardSessionId}, step {StepNumber}, substep {SubStep}", wizardSessionId, stepNumber, substepNumber);
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
        public async Task<IEnumerable<WizardStepRowEntity>?> GetRawWizardStepDataAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string query = @"
            SELECT StepNumber, SubStep, StepData
            FROM WizardStep
            WHERE WizardSessionId = @WizardSessionId
            ORDER BY StepNumber ASC";

            try
            {
                if (conn != null)
                {
                    return await conn.QueryAsync<WizardStepRowEntity>(query, new { WizardSessionId = wizardSessionId }, tx);
                }
                else
                {
                    using var localConn = await GetOpenConnectionAsync();
                    return await localConn.QueryAsync<WizardStepRowEntity>(query, new { WizardSessionId = wizardSessionId });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error when retrieving raw wizard data for session {WizardSessionId}", wizardSessionId);
                return null;
            }
        }

        public async Task<int> GetWizardSubStepAsync(string wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string query = @"
            SELECT SubStep
            FROM WizardStep
            WHERE WizardSessionId = @WizardSessionId
            ORDER BY StepNumber DESC
            LIMIT 1;";

            try
            {
                if (conn != null)
                {
                    return await conn.QuerySingleOrDefaultAsync<int>(query, new { WizardSessionId = wizardSessionId }, tx);
                }
                else
                {
                    using var localConn = await GetOpenConnectionAsync();
                    return await localConn.QuerySingleOrDefaultAsync<int>(query, new { WizardSessionId = wizardSessionId });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error when retrieving wizard substep for session {WizardSessionId}", wizardSessionId);
                throw;
            }
        }

    }
}
