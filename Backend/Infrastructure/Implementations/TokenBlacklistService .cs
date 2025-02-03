using Backend.Application.Interfaces.JWT;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

public class TokenBlacklistService : ITokenBlacklistService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<TokenBlacklistService> _logger;

    public TokenBlacklistService(IDistributedCache cache, ILogger<TokenBlacklistService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task BlacklistTokenAsync(string jti, DateTime expiration)
    {
        if (string.IsNullOrEmpty(jti))
            throw new ArgumentException("Token JTI cannot be null or empty.", nameof(jti));

        var expirationInSeconds = (int)(expiration - DateTime.UtcNow).TotalSeconds;
        if (expirationInSeconds <= 0)
        {
            _logger.LogWarning($"Token JTI {jti} has already expired. Skipping blacklist.");
            return;
        }

        // Add the JTI to the cache with the token's expiration time
        await _cache.SetStringAsync(jti, "blacklisted", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(expirationInSeconds)
        });

        _logger.LogInformation($"Token JTI {jti} blacklisted until {expiration}.");
    }

    public async Task<bool> IsTokenBlacklistedAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
            throw new ArgumentException("Token JTI cannot be null or empty.", nameof(jti));

        // Check if the JTI exists in the cache
        var result = await _cache.GetStringAsync(jti);
        return result != null;
    }
}
