// This class handles blacklisting of tokens by adding them to a cache and a database. It also checks if a token is blacklisted.

using Backend.Application.Interfaces.JWT;
using Microsoft.Extensions.Caching.Distributed;
using Backend.Infrastructure.Data.Sql.Interfaces;
using Microsoft.AspNetCore.Mvc.Filters;

public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly IUserSQLProvider _userSQLProvider;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBlacklistService> _logger;

    public TokenBlacklistService(IUserSQLProvider userSQLProvider, IDistributedCache cache, ILogger<TokenBlacklistService> logger)
    {
        _userSQLProvider = userSQLProvider;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> BlacklistTokenAsync(string jti, DateTime expiration)
    {
        if (string.IsNullOrEmpty(jti))
        {
            _logger.LogInformation("Token was null or empty");
            return false;
        }

        var expirationInSeconds = (int)(expiration - DateTime.UtcNow).TotalSeconds;
        if (expirationInSeconds <= 0)
        {
            _logger.LogWarning($"Token JTI {jti} has already expired. Skipping blacklist.");
            return false;
        }

        // Add the JTI to the cache with the token's expiration time
        await _cache.SetStringAsync(jti, "blacklisted", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(expirationInSeconds)
        });

        // Insert blacklisted token in the database
        bool success = await _userSQLProvider.RefreshTokenSqlExecutor.AddBlacklistedTokenAsync(jti, expiration);
        if(success)
        {
            _logger.LogInformation($"Token JTI {jti} blacklisted until {expiration}.");
            return true;
        }
        else
        {
            _logger.LogWarning($"Token {jti} not inserted correctly into database.");
            return false;
        }
    }
    public async Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate)
    {
        if (string.IsNullOrEmpty(jti))
        {
            _logger.LogInformation("BlacklistTokenByJtiAsync: JTI is null or empty.");
            return false;
        }

        var expirationInSeconds = (int)(accessTokenExpiryDate - DateTime.UtcNow).TotalSeconds;
        if (expirationInSeconds <= 0)
        {
            _logger.LogWarning($"Token JTI {jti} has already expired. Skipping blacklist.");
            return true;  // Already expired; no need to blacklist.
        }

        try
        {
            // Add the JTI to the distributed cache with the token's expiration time.
            await _cache.SetStringAsync(jti, "blacklisted", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(expirationInSeconds)
            });

            // Insert the blacklisted token into the database.
            bool success = await _userSQLProvider.RefreshTokenSqlExecutor.AddBlacklistedTokenAsync(jti, accessTokenExpiryDate);
            if (success)
            {
                _logger.LogInformation($"Token with JTI {jti} has been blacklisted until {accessTokenExpiryDate}.");
                return true;
            }
            else
            {
                _logger.LogWarning($"Token {jti} not inserted correctly into database.");
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while blacklisting token by JTI.");
            return false;
        }
    }
    public async Task<bool> IsTokenBlacklistedAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
            throw new ArgumentException("Token JTI cannot be null or empty.", nameof(jti));

        // Check if the JTI exists in the cache
        var result = await _cache.GetStringAsync(jti);
        if(string.IsNullOrEmpty(result))
            return false;
        // Check if the JTI exists in the database
        var isBlacklistedDB = await _userSQLProvider.RefreshTokenSqlExecutor.IsTokenBlacklistedAsync(jti);
        if (!isBlacklistedDB)
            return false;
        return true;
    }
}
