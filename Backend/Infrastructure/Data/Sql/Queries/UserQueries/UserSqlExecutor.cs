using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Interfaces.UserQueries;
using Dapper;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;
using System.Data.Common;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    public class UserSqlExecutor : SqlBase, IUserSqlExecutor
    {
        public UserSqlExecutor(IConnectionFactory connectionFactory, ILogger<UserSqlExecutor> logger)
        : base(connectionFactory, logger)
        {

        }
        public async Task<bool> IsUserExistInDatabaseAsync(string email, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "SELECT COUNT(1) FROM User WHERE Email = @Email";
            int count;

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                count = await ExecuteScalarAsync<int>(conn, sqlQuery, new { Email = email }, tx);
            }
            else
            {
                // No connection provided—open a new connection.
                using var localConn = await GetOpenConnectionAsync();
                count = await ExecuteScalarAsync<int>(localConn, sqlQuery, new { Email = email });
            }

            return count > 0;
        }
        public async Task<bool> InsertNewUserDatabaseAsync(UserModel user, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = @"INSERT INTO User (Persoid, Firstname, Lastname, Email, Password, Roles, CreatedBy)
                        VALUES (@Persoid, @Firstname, @Lastname, @Email, @Password, @Roles, 'System')";

            try
            {
                _logger.LogInformation("Starting user insertion for email: {Email}", user.Email);

                // If a transaction (and connection) are provided, use them.
                if (conn != null && tx != null)
                {
                    int rowsAffected = await ExecuteAsync(conn, sqlQuery, user, tx);
                    _logger.LogInformation("User inserted successfully. Rows affected: {RowsAffected}", rowsAffected);
                    return rowsAffected > 0;
                }
                else
                {
                    // Otherwise, use the transaction wrapper to open a new connection and transaction.
                    return await ExecuteInTransactionAsync(async (newConn, newTx) =>
                    {
                        int rowsAffected = await ExecuteAsync(newConn, sqlQuery, user, newTx);
                        _logger.LogInformation("User inserted successfully. Rows affected: {RowsAffected}", rowsAffected);
                        return rowsAffected > 0;
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inserting new user: {Email}", user.Email);
                return false;
            }
        }

        public async Task<UserModel?> GetUserModelAsync(
            Guid? persoid = null,
            string? email = null,
            DbConnection? conn = null,
            DbTransaction? tx = null)
        {
            if (persoid == null && string.IsNullOrEmpty(email))
            {
                throw new ArgumentException("Either PersoId or Email must be provided.");
            }

            string sqlQuery = persoid != null
                ? "SELECT * FROM User WHERE PersoId = @PersoId"
                : "SELECT * FROM User WHERE Email = @Email";

            var parameters = new DynamicParameters();
            if (persoid != null)
            {
                parameters.Add("PersoId", persoid);
            }
            else
            {
                parameters.Add("Email", email);
            }

            UserModel? user;
            if (conn != null)
            {
                // Use the provided connection and transaction
                user = await QueryFirstOrDefaultAsync<UserModel>(conn, sqlQuery, parameters, tx);
            }
            else
            {
                // No connection provided—open a new connection
                using var localConn = await GetOpenConnectionAsync();
                user = await QueryFirstOrDefaultAsync<UserModel>(localConn, sqlQuery, parameters);
            }

            if (user == null)
            {
                _logger.LogWarning("User not found in database. Email: {Email}, PersoId: {PersoId}", email, persoid);
            }

            return user;
        }

        public async Task<bool> IsEmailAlreadyConfirmedAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                string checkQuery = "SELECT COALESCE(EmailConfirmed, 0) FROM User WHERE PersoId = @PersoId";
                bool result;

                if (conn != null)
                {
                    // Use the provided connection and transaction.
                    result = await QueryFirstOrDefaultAsync<bool>(conn, checkQuery, new { PersoId = persoid }, tx);
                }
                else
                {
                    // No connection provided—open a new connection.
                    using var localConn = await GetOpenConnectionAsync();
                    result = await QueryFirstOrDefaultAsync<bool>(localConn, checkQuery, new { PersoId = persoid });
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check email confirmation status for Persoid: {Persoid}", persoid);
                throw;
            }
        }
        public async Task<int> UpdateEmailConfirmationAsync(Guid persoid, DbConnection? conn = null, DbTransaction? tx = null)
        {
            try
            {
                string updateQuery = "UPDATE User SET EmailConfirmed = 1 WHERE PersoId = @PersoId";
                int rowsAffected;

                if (conn != null)
                {
                    // Use the provided connection and transaction.
                    rowsAffected = await ExecuteAsync(conn, updateQuery, new { PersoId = persoid }, tx);
                }
                else
                {
                    // No connection provided—open a new connection.
                    using var localConn = await GetOpenConnectionAsync();
                    rowsAffected = await ExecuteAsync(localConn, updateQuery, new { PersoId = persoid });
                }

                return rowsAffected;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update email confirmation for Persoid: {PersoId}", persoid);
                throw;
            }
        }
        public async Task<int> DeleteUserByEmailAsync(string email, DbConnection? conn = null, DbTransaction? tx = null)
        {
            string sqlQuery = "DELETE FROM User WHERE Email = @Email";

            if (conn != null)
            {
                // Use the provided connection and transaction (if any)
                return await ExecuteAsync(conn, sqlQuery, new { Email = email }, tx);
            }
            else
            {
                // No connection provided—open a new connection
                using var localConn = await GetOpenConnectionAsync();
                return await ExecuteAsync(localConn, sqlQuery, new { Email = email });
            }
        }

    }
}
