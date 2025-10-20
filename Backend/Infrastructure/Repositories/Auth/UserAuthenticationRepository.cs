using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Domain.Entities.User;
using Microsoft.Extensions.Options;
using Backend.Settings;

namespace Backend.Infrastructure.Repositories.Auth;

internal sealed class UserAuthenticationRepository : SqlBase, IUserAuthenticationRepository
{
    private readonly ITimeProvider _clock;
    public UserAuthenticationRepository(IUnitOfWork uow, ILogger<UserAuthenticationRepository> log, ITimeProvider clock, IOptions<DatabaseSettings> db) : base(uow, log, db) { _clock = clock; }

    public Task<UserModel?> GetByEmailAsync(string email, CancellationToken ct)
        => QuerySingleOrDefaultAsync<UserModel>(
           "SELECT PersoId, Email, Password AS PasswordHash, EmailConfirmed, LockoutUntil FROM Users WHERE Email = @Email LIMIT 1;",
           new { Email = email }, ct);

    public Task InsertFailedAttemptAsync(Guid persoId, string ip, string ua, DateTime atUtc, CancellationToken ct)
        => ExecuteAsync("""
           INSERT INTO FailedLoginAttempts (PersoId, IpAddress, UserAgent, AttemptTime)
           VALUES (@PersoId, @Ip, @Ua, @At);
           """, new { PersoId = persoId, Ip = ip, Ua = ua, At = atUtc }, ct);

    public Task<int> CountFailedAttemptsSinceAsync(string email, DateTime sinceUtc, CancellationToken ct)
        => ExecuteScalarAsync<int>("""
           SELECT COUNT(*)
             FROM FailedLoginAttempts a
             JOIN Users u ON u.PersoId = a.PersoId
            WHERE u.Email = @Email AND a.AttemptTime > @Since;
           """, new { Email = email, Since = sinceUtc }, ct);

    public Task LockUserByEmailAsync(string email, DateTime untilUtc, CancellationToken ct)
        => ExecuteAsync("UPDATE Users SET LockoutUntil = @Until WHERE Email = @Email;", new { Until = untilUtc, Email = email }, ct);

    public Task DeleteAttemptsByEmailAsync(string email, CancellationToken ct)
        => ExecuteAsync("""
           DELETE a FROM FailedLoginAttempts a
           JOIN Users u ON u.PersoId = a.PersoId
           WHERE u.Email = @Email;
           """, new { Email = email }, ct);

    public Task<int> UnlockUserAsync(Guid persoid, CancellationToken ct)
        => ExecuteAsync(
           "UPDATE `User` SET LockoutUntil = NULL WHERE PersoId = @Id AND LockoutUntil IS NOT NULL AND LockoutUntil <= UTC_TIMESTAMP();",
           new { Id = persoid }, ct);

    public async Task InsertLoginAttemptAsync(UserModel user, string ip, string userAgent, DateTime atUtc, CancellationToken ct)
    {
        const string sql = @"
            INSERT INTO FailedLoginAttempts (PersoId, IpAddress, UserAgent, AttemptTime)
            VALUES (@PersoId, @Ip, @Ua, @At);";

        await ExecuteAsync(sql, new { PersoId = user.PersoId, Ip = ip, Ua = userAgent, At = atUtc }, ct);
    }
}
