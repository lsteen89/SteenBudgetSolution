using Backend.Application.Models.Token;
using Backend.Infrastructure.Entities.Tokens;
using System;
using static Dapper.SqlMapper;

// A mapper class that maps the RefreshTokenModel to the RefreshJwtTokenEntity and vice versa.
// This is used to transition the RefreshTokenModel to the RefreshJwtTokenEntity, infrastructure layer to application layer and vice versa.
namespace Backend.Application.Mappers;

public static class RefreshTokenMapper
{
    /// <summary>
    /// Convert DB entity → domain model (immutable record).
    /// </summary>
    public static JwtRefreshTokenModel? ToDomain(this RefreshJwtTokenEntity? e)
        => e is null
            ? null
            : new JwtRefreshTokenModel(
                  e.TokenId,
                  e.Persoid,
                  e.SessionId,
                  e.HashedToken,
                  e.AccessTokenJti, 
                  e.ExpiresRollingUtc,
                  e.ExpiresAbsoluteUtc,
                  e.RevokedUtc,
                  e.Status,
                  e.DeviceId,
                  e.UserAgent,
                  e.CreatedUtc);

    /// <summary>
    /// Convert domain model → DB entity.
    /// You typically call this only from the repository when inserting a row.
    /// </summary>
    public static RefreshJwtTokenEntity ToEntity(
        this JwtRefreshTokenModel m,
        DateTime? createdUtcOverride = null)       // handy for tests
        => new()
        {
            TokenId = m.TokenId,
            Persoid = m.Persoid,
            SessionId = m.SessionId,
            HashedToken = m.HashedToken,
            AccessTokenJti = m.AccessTokenJti,
            ExpiresRollingUtc = m.ExpiresRollingUtc,
            ExpiresAbsoluteUtc = m.ExpiresAbsoluteUtc,
            RevokedUtc = m.RevokedUtc,
            Status = m.Status,
            DeviceId = m.DeviceId,
            UserAgent = m.UserAgent,
            CreatedUtc = createdUtcOverride ?? m.CreatedUtc
        };
}
