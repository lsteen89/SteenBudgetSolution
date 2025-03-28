// This class handles blacklisting of tokens by adding them to a cache and a database. It also checks if a token is blacklisted.
// However, due to convenience, this class has at least one method that falls out of the blacklisting scope. This method is used to check if an access token JTI exists.
using Backend.Application.Interfaces.JWT;
using Backend.Infrastructure.Data.Sql.Interfaces.Providers;
using Microsoft.Extensions.Caching.Distributed;
using System.Data.Common;

public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly IUserSQLProvider _userSQLProvider;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBlacklistService> _logger;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(1);

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
    public async Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate, DbTransaction tx)
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
            bool success = await _userSQLProvider.RefreshTokenSqlExecutor.AddBlacklistedTokenAsync(jti, accessTokenExpiryDate, conn: tx.Connection, tx: tx);
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

        // Try to get the cached value (e.g., "true" or "false")
        var cacheResult = await _cache.GetStringAsync(jti);
        if (!string.IsNullOrEmpty(cacheResult))
        {
            // Parse the cached string to a boolean
            if (bool.TryParse(cacheResult, out bool isBlacklisted))
                return isBlacklisted;
        }

        // If not in cache, check the database
        bool isBlacklistedDB = await _userSQLProvider.RefreshTokenSqlExecutor.IsTokenBlacklistedAsync(jti);

        // Cache the result as a string ("true" or "false") for _cacheDuration
        await _cache.SetStringAsync(jti, isBlacklistedDB.ToString(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _cacheDuration
        });

        return isBlacklistedDB;
    }
    // Note: This method falls out of the blacklisting scope, but it is used to check if an access token JTI exists.
    public async Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti)
    {
        if (string.IsNullOrEmpty(accessTokenJti))
            throw new ArgumentException("Access token JTI cannot be null or empty.", nameof(accessTokenJti));

        // Try to get the cached value (as a string "true"/"false")
        var cacheResult = await _cache.GetStringAsync(accessTokenJti);
        if (!string.IsNullOrEmpty(cacheResult))
        {
            if (bool.TryParse(cacheResult, out bool Tokenexists))
                return Tokenexists;
        }

        // If not in cache, query the database using a lightweight SQL query.
        bool AccessTokenJtiExists = await _userSQLProvider.RefreshTokenSqlExecutor.DoesAccessTokenJtiExistAsync(accessTokenJti);

        // Cache the result as a string for _cacheDuration
        await _cache.SetStringAsync(accessTokenJti, AccessTokenJtiExists.ToString(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _cacheDuration
        });

        return AccessTokenJtiExists;
    }
}
