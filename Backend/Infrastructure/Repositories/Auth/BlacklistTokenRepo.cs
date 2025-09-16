using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;

public class TokenBlacklistRepo : SqlBase, ITokenBlacklistRepo
{
    public TokenBlacklistRepo(IUnitOfWork uow, ILogger<TokenBlacklistRepo> logger)
        : base(uow, logger) { }

    public async Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expirationUtc, CancellationToken ct)
    {
        const string sql = @"
        INSERT INTO BlacklistedTokens (Jti, ExpiresUtc)
        VALUES (@Jti, @ExpiresUtc)
        ON DUPLICATE KEY UPDATE ExpiresUtc = GREATEST(ExpiresUtc, VALUES(ExpiresUtc));";

        var rows = await ExecuteAsync(sql, new { Jti = jti, ExpiresUtc = expirationUtc }, ct);
        return rows > 0;
    }

    public async Task<bool> IsTokenBlacklistedAsync(string jti)
    {
        const string sql = @"SELECT 1 FROM BlacklistedTokens WHERE Jti = @Jti AND ExpiresUtc > UTC_TIMESTAMP() LIMIT 1;";
        var one = await ExecuteScalarAsync<int?>(sql, new { Jti = jti });
        return one == 1;
    }

    // (Optional) If something calls this, keep it as an alias:
    public Task<bool> IsJtiBlacklistedAsync(string jti, CancellationToken ct)
        => IsTokenBlacklistedAsync(jti);
}
