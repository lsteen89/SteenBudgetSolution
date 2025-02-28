using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Backend.Infrastructure.Data;
using Backend.Infrastructure.Data.Sql.Interfaces.WizardQueries;
using System.Data.Common;

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

    }
}
