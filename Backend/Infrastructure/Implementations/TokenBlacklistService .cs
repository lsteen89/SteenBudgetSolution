// This class handles blacklisting of tokens by adding them to a cache and a database. It also checks if a token is blacklisted.
// However, due to convenience, this class has at least one method that falls out of the blacklisting scope. This method is used to check if an access token JTI exists.
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace Backend.Infrastructure.Implementations;

[Obsolete("This is a god class. Must be refactored into smaller classes asap. It will be refactored together with JwtService.")]
public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly ITokenBlacklistRepo _blacklist;
    private readonly IRefreshTokenRepository _refresh;
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBlacklistService> _logger;
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(1);

    public TokenBlacklistService(ITokenBlacklistRepo blacklist, IRefreshTokenRepository refresh, IDistributedCache cache, ILogger<TokenBlacklistService> logger)
    {
        _blacklist = blacklist;
        _refresh = refresh;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> BlacklistTokenAsync(string jti, DateTime expiration, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(jti))
        {
            _logger.LogInformation("Token was null or empty");
            return false;
        }

        var ttl = expiration - DateTime.UtcNow;
        if (ttl <= TimeSpan.Zero)
        {
            _logger.LogWarning("Token JTI {Jti} already expired – skip blacklist", jti);
            return false;
        }

        try
        {
            await _cache.SetStringAsync(jti, "blacklisted",
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        }
        catch (RedisConnectionException ex)
        {
            _logger.LogWarning(ex, "Redis down – blacklist only in DB for JTI {Jti}", jti);
            // fall through – we still write to DB
        }

        var ok = await _blacklist.AddBlacklistedTokenAsync(jti, expiration, ct);
        if (ok)
            _logger.LogInformation("Token JTI {Jti} blacklisted until {Exp}", jti, expiration);
        else
            _logger.LogWarning("Failed to insert JTI {Jti} in DB", jti);

        return ok;
    }
    public async Task<bool> IsTokenBlacklistedAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
            throw new ArgumentException("Token JTI cannot be null or empty.", nameof(jti));

        // Try to get the cached value (e.g., "true" or "false")
        try
        {
            var cacheResult = await _cache.GetStringAsync(jti);
            if (!string.IsNullOrEmpty(cacheResult))
            {
                return bool.TryParse(cacheResult, out var isBlacklisted) && isBlacklisted;
            }
        }
        catch (Exception ex)
        {
            // Log the error but DO NOT re-throw. The app must continue working.
            _logger.LogWarning(ex, "Redis connection failed. Checking blacklist in DB for JTI {Jti}.", jti);
        }

        // Fall back to the database if the cache fails or has no entry
        bool isBlacklistedDB = await _blacklist.IsTokenBlacklistedAsync(jti);

        // You can even try to cache the DB result here again, but it might also fail
        // and should be in its own try...catch block if you do.

        return isBlacklistedDB;
    }
    // Note: This method falls out of the blacklisting scope, but it is used to check if an access token JTI exists.
    public async Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct)
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
        bool AccessTokenJtiExists = await _refresh.DoesAccessTokenJtiExistAsync(accessTokenJti, ct);

        // Cache the result as a string for _cacheDuration
        await _cache.SetStringAsync(accessTokenJti, AccessTokenJtiExists.ToString(), new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = _cacheDuration
        });

        return AccessTokenJtiExists;
    }
}
