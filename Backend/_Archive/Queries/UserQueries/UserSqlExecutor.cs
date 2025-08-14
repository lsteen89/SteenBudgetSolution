using Backend.Domain.Entities.User;
using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;

namespace Backend.Infrastructure.Data.Sql.Queries.UserQueries
{
    public sealed class UserSqlExecutor : SqlBase, IUserSqlExecutor
    {
        [Obsolete("Use the new UserSqlExecutor instead. This will be removed in a future version.")]
        public UserSqlExecutor(IUnitOfWork unitOfWork, ILogger<UserSqlExecutor> logger)
            : base(unitOfWork, logger) { }

        public Task<bool> IsUserExistInDatabaseAsync(string email, CancellationToken ct = default)
        {
            const string sql = "SELECT EXISTS(SELECT 1 FROM Users WHERE Email = @Email)";
            return ExecuteScalarAsync<bool>(sql, new { Email = email }, ct);
        }

        public async Task<bool> InsertNewUserDatabaseAsync(UserModel user, CancellationToken ct = default)
        {
            const string sql = @"
            INSERT INTO users (PersoId, Firstname, Lastname, Email, Password, Roles, CreatedBy)
            VALUES (@PersoId, @Firstname, @Lastname, @Email, @Password, @Roles, 'System');";

            _logger.LogInformation("Inserting user {Email}", user.Email);
            var rows = await ExecuteAsync(sql, new
            {
                user.PersoId,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Password,
                user.Roles
            }, ct);
            _logger.LogInformation("Insert completed. Rows affected: {Rows}", rows);
            return rows == 1;
        }

        public Task<UserModel?> GetUserModelAsync(
            Guid? persoid = null,
            string? email = null,
            CancellationToken ct = default)
        {
            if (persoid is null && string.IsNullOrWhiteSpace(email))
                throw new ArgumentException("Either PersoId or Email must be provided.");

            const string byId = "SELECT * FROM Users WHERE PersoId = @PersoId LIMIT 1;";
            const string byEmail = "SELECT * FROM Users WHERE Email   = @Email   LIMIT 1;";

            return persoid is not null
                ? QueryFirstOrDefaultAsync<UserModel>(byId, new { PersoId = persoid }, ct)
                : QueryFirstOrDefaultAsync<UserModel>(byEmail, new { Email = email!.Trim() }, ct);
        }

        public Task<bool> IsEmailAlreadyConfirmedAsync(Guid persoid, CancellationToken ct = default)
        {
            const string sql = "SELECT COALESCE(EmailConfirmed, 0) FROM Users WHERE PersoId = @PersoId LIMIT 1;";
            return QueryFirstOrDefaultAsync<bool>(sql, new { PersoId = persoid }, ct);
        }

        public Task<bool> ConfirmUserEmailAsync(Guid persoid, CancellationToken ct = default)
        {
            const string sql = "UPDATE Users SET EmailConfirmed = 1 WHERE PersoId = @PersoId;";
            return QueryFirstOrDefaultAsync<bool>(sql, new { PersoId = persoid }, ct);
        }

        public Task<int> DeleteUserByEmailAsync(string email, CancellationToken ct = default)
        {
            const string sql = "DELETE FROM Users WHERE Email = @Email;";
            return ExecuteAsync(sql, new { Email = email }, ct);
        }
    }
}
