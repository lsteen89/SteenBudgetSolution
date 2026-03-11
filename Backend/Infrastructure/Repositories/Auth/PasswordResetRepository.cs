using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Models.Auth;
using Backend.Infrastructure.Data.BaseClass;
using Backend.Settings;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Repositories.Auth;

public sealed class PasswordResetRepository : SqlBase, IPasswordResetRepository
{
    public PasswordResetRepository(
        IUnitOfWork unitOfWork,
        ILogger<PasswordResetRepository> logger,
        IOptions<DatabaseSettings> db)
        : base(unitOfWork, logger, db) { }

    public async Task CreateAsync(PasswordResetCodeRecord record, CancellationToken ct)
    {
        const string sql = """
            INSERT INTO PasswordResetRequests
            (
                Id,
                Persoid,
                Email,
                CodeHash,
                ExpiresAtUtc,
                UsedAtUtc,
                CreatedAtUtc,
                InvalidatedAtUtc
            )
            VALUES
            (
                @Id,
                @Persoid,
                @Email,
                @CodeHash,
                @ExpiresAtUtc,
                @UsedAtUtc,
                @CreatedAtUtc,
                @InvalidatedAtUtc
            );
            """;

        await ExecuteAsync(sql, new
        {
            record.Id,
            Persoid = record.UserId,
            record.Email,
            record.CodeHash,
            record.ExpiresAtUtc,
            record.UsedAtUtc,
            record.CreatedAtUtc,
            record.InvalidatedAtUtc
        }, ct);
    }

    public Task<PasswordResetCodeRecord?> GetActiveByEmailAsync(string email, CancellationToken ct)
    {
        const string sql = """
        SELECT
            Id,
            Persoid AS UserId,
            Email,
            CodeHash,
            ExpiresAtUtc,
            CreatedAtUtc,
            UsedAtUtc,
            InvalidatedAtUtc
        FROM PasswordResetRequests
        WHERE Email = @Email
          AND UsedAtUtc IS NULL
          AND InvalidatedAtUtc IS NULL
        ORDER BY CreatedAtUtc DESC
        LIMIT 1;
        """;

        return QueryFirstOrDefaultAsync<PasswordResetCodeRecord>(
            sql,
            new { Email = email.Trim().ToLowerInvariant() },
            ct
        );
    }

    public async Task InvalidateActiveCodesForUserAsync(Guid userId, CancellationToken ct)
    {
        const string sql = """
            UPDATE PasswordResetRequests
            SET InvalidatedAtUtc = CURRENT_TIMESTAMP(6)
            WHERE Persoid = @Persoid
              AND UsedAtUtc IS NULL
              AND InvalidatedAtUtc IS NULL;
            """;

        await ExecuteAsync(sql, new { Persoid = userId }, ct);
    }

    public async Task MarkUsedAsync(Guid resetId, CancellationToken ct)
    {
        const string sql = """
            UPDATE PasswordResetRequests
            SET UsedAtUtc = CURRENT_TIMESTAMP(6)
            WHERE Id = @Id
              AND UsedAtUtc IS NULL;
            """;

        await ExecuteAsync(sql, new { Id = resetId }, ct);
    }
}