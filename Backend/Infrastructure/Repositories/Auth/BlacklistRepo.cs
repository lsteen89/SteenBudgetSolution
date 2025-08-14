using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Infrastructure.Data.BaseClass;

public class BlacklistRepo : SqlBase, IBlacklistRepo
{
    public BlacklistRepo(IUnitOfWork uow, ILogger<BlacklistRepo> logger)
        : base(uow, logger) { }

    public async Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, CancellationToken ct)
    {
        try
        {
            string sql = @"
            INSERT INTO BlacklistedTokens (Jti, ExpiryDate)
            VALUES (@Jti, @ExpiryDate)
            ON DUPLICATE KEY UPDATE
            ExpiryDate = GREATEST(ExpiryDate, VALUES(ExpiryDate));";
            int rowsAffected = await ExecuteAsync(sql, new { Jti = jti, ExpiryDate = expiration }, ct);
            _logger.LogInformation("Blacklisted token added successfully for Jti: {Jti}", jti);
            return rowsAffected > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while adding blacklisted token for Jti: {Jti}", jti);
            return false;
        }
    }

    public async Task<bool> IsTokenBlacklistedAsync(string jti, CancellationToken ct)
    {
        string sql = "SELECT COUNT(1) FROM BlacklistedTokens WHERE Jti = @Jti";
        int count = await ExecuteScalarAsync<int>(sql, new { Jti = jti }, ct);
        return count > 0;
    }
    public async Task<bool> IsJtiBlacklistedAsync(string jti, CancellationToken ct)
    {
        // The logic should be slightly different if you have a dedicated blacklist table.
        // This example assumes a dedicated table.
        const string sql = "SELECT COUNT(1) FROM TokenBlacklist WHERE Jti = @Jti AND Expiration > NOW();";
        int count = await ExecuteScalarAsync<int>(sql, new { Jti = jti }, ct);
        return count > 0;
    }
}