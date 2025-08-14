using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using System.Data.Common;
using Dapper;
using Backend.Application.DTO.Wizard;
using Backend.Infrastructure.Entities.Tokens;
using Backend.Domain.Entities.Wizard;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.WizardQueries;
using Backend.Application.Abstractions.Infrastructure.Data;

namespace Backend.Infrastructure.Data.Sql.Queries.WizardQuery
{
    public class WizardSqlExecutor : SqlBase, IWizardSqlExecutor
    {
        public WizardSqlExecutor(IUnitOfWork unitOfWork, ILogger<WizardSqlExecutor> logger)
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

            // Execute the SQL command
            int rowsAffected = await ExecuteAsync(sql, parameters, ct);

            return rowsAffected > 0 ? wizardSessionId : Guid.Empty;
        }
        public async Task<Guid?> GetSessionIdByUserIdAsync(Guid persoId, CancellationToken ct = default)
        {
            string sql = "SELECT WizardSessionId FROM WizardSession WHERE Persoid = @Persoid";
            return await QueryFirstOrDefaultAsync<Guid?>(sql, new { Persoid = persoId }, ct);
        }
        public async Task<bool> UpsertStepDataAsync(
            Guid wizardSessionId,
            int stepNumber,
            int substepNumber,
            string jsonData,
            int dataVersion,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            try
            {
                string sql = @"
            INSERT INTO WizardStep (WizardSessionId, StepNumber, SubStep, StepData, DataVersion, UpdatedAt)
            VALUES (@WizardSessionId, @StepNumber, @SubStep, @StepData, @DataVersion, UTC_TIMESTAMP())
            ON DUPLICATE KEY UPDATE
                StepData = @StepData,
                DataVersion = @DataVersion,
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
                        StepData = jsonData,
                        DataVersion = dataVersion
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
                        StepData = jsonData,
                        DataVersion = dataVersion
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
        public async Task<IEnumerable<WizardStepRowEntity>?> GetRawWizardStepDataAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string query = @"
            SELECT StepNumber, SubStep, StepData, DataVersion
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

        public async Task<int> GetWizardSubStepAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null)
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
        public async Task<WizardSessionDto> GetWizardSessionAsync(Guid wizardSessionId, DbConnection? conn = null, DbTransaction? tx = null)
        {
            const string query = @"
            SELECT 
                WizardsessionId, 
                Persoid
            FROM WizardSession
            WHERE WizardSessionId = @WizardSessionId";
            var parameters = new DynamicParameters();
            parameters.Add("WizardSessionId", wizardSessionId);

            WizardSessionDto? session;

            try
            {
                if (conn != null)
                {
                    return await QueryFirstOrDefaultAsync<WizardSessionDto>(conn, query, parameters, tx);
                }
                else
                {
                    using var localConn = await GetOpenConnectionAsync();
                    return await QueryFirstOrDefaultAsync<WizardSessionDto>(localConn, query, parameters, tx);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database error when checking wizard session {WizardSessionId}", wizardSessionId);
                throw;
            }
        }
    }
}
