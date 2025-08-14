using Backend.Infrastructure.Data.Sql.Interfaces.Helpers;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.AuthQueries;
using Backend.Infrastructure.Data.Sql.Interfaces.Queries.UserQueries;
using Backend.Infrastructure.Data.Sql.Interfaces.Factories;

namespace Backend.Infrastructure.Data.Sql.Queries.AuthQueries;

[Obsolete("Use the repository ")]
public sealed class AuthenticationSqlExecutor : SqlBase, IAuthenticationSqlExecutor
{
    private readonly ILogger<AuthenticationSqlExecutor> _log;
    private readonly IUserSqlExecutor _users;

    // NEW preferred ctor
    public AuthenticationSqlExecutor(
        IUnitOfWork uow,
        ILogger<AuthenticationSqlExecutor> log,
        IUserSqlExecutor users) : base(uow, log)
    { _log = log; _users = users; }

    // LEGACY ctor (kept for BC during migration)
    [Obsolete("Use the IUnitOfWork constructor")]
    public AuthenticationSqlExecutor(
        IConnectionFactory cf,
        ILogger<AuthenticationSqlExecutor> log,
        IUserSqlExecutor users) : base(cf, log)
    { _log = log; _users = users; }

    // ---- Lock / unlock ------------------------------------------------------

    public Task LockUserByEmailAsync(string email, DateTime untilUtc, CancellationToken ct)
        => ExecuteAsync("UPDATE `User` SET LockoutUntil = @Until WHERE Email = @Email;",
                        new { Until = untilUtc, Email = email }, ct);

    public Task UnlockUserAsync(Guid persoid, CancellationToken ct)
        => ExecuteAsync("UPDATE `User` SET LockoutUntil = NULL WHERE PersoId = @PersoId;",
                        new { PersoId = persoid }, ct);

    // ---- Failed attempts ----------------------------------------------------

    // Persist a failed attempt (looks up PersoId via the same UoW)
    public async Task InsertLoginAttemptAsync(string email, string ip, string userAgent, DateTime atUtc, CancellationToken ct)
    {
        var user = await _users.GetUserModelAsync(email: email, ct: ct);
        if (user is null) { _log.LogWarning("Failed login for non-existent email {Email}", email); return; }

        const string sql = @"
            INSERT INTO FailedLoginAttempts (PersoId, IpAddress, UserAgent, AttemptTime)
            VALUES (@PersoId, @Ip, @Ua, @At);";

        await ExecuteAsync(sql, new { PersoId = user.PersoId, Ip = ip, Ua = userAgent, At = atUtc }, ct);
    }

    public Task<int> GetFailedCountSinceAsync(string email, DateTime sinceUtc, CancellationToken ct)
        => ExecuteScalarAsync<int>(@"
            SELECT COUNT(*)
            FROM FailedLoginAttempts a
            JOIN `User` u ON u.PersoId = a.PersoId
            WHERE u.Email = @Email AND a.AttemptTime > @Since;",
            new { Email = email, Since = sinceUtc }, ct);

    public Task DeleteAttemptsAsync(string email, CancellationToken ct)
        => ExecuteAsync(@"
            DELETE a FROM FailedLoginAttempts a
            JOIN `User` u ON u.PersoId = a.PersoId
            WHERE u.Email = @Email;",
            new { Email = email }, ct);

    // ---- Password update ----------------------------------------------------

    public async Task<bool> UpdatePasswordAsync(Guid persoid, string hashedPassword, CancellationToken ct)
        => (await ExecuteAsync("UPDATE `User` SET Password = @Pwd WHERE PersoId = @Id;",
                               new { Id = persoid, Pwd = hashedPassword }, ct)) > 0;

    // ---- Deprecated (remove after migration) --------------------------------
    [Obsolete("Use LockUserByEmailAsync(email, untilUtc, ct)")]
    public Task LockUserAsync(string email, TimeSpan lockoutDuration, CancellationToken ct = default)
        => LockUserByEmailAsync(email, DateTime.UtcNow.Add(lockoutDuration), ct);
}
