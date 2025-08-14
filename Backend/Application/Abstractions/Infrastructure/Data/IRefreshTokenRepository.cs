using Backend.Infrastructure.Entities.Tokens;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IRefreshTokenRepository
{
    // Used by the refresh flow (SELECT ... FOR UPDATE)


    Task<int> InsertAsync(RefreshJwtTokenEntity row, CancellationToken ct);
    Task<int> RevokeSessionAsync(Guid persoId, Guid sessionId, DateTime nowUtc, CancellationToken ct);
    Task<int> RevokeAllForUserAsync(Guid persoid, DateTime nowUtc, CancellationToken ct);

    Task<RefreshJwtTokenEntity?> GetActiveByCookieForUpdateAsync(Guid sessionId, string cookieHash, DateTime nowUtc, CancellationToken ct);
    Task<int> RotateInPlaceAsync(Guid tokenId, string oldHash, string newHash, string newAccessJti, DateTime newRollingUtc, CancellationToken ct);
    Task<int> RevokeByIdAsync(Guid tokenId, DateTime nowUtc, CancellationToken ct); // still used for explicit revokes

    // Used by the expired token scanner
    Task<IEnumerable<RefreshJwtTokenEntity>> GetExpiredTokensAsync(int batchSize = 1000, CancellationToken ct = default);
    Task<bool> DeleteTokenAsync(string refreshToken, CancellationToken ct);
    // Used by the token blacklist service
    Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct);
}
