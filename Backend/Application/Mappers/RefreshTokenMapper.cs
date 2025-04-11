using Backend.Application.Models.Token;
using Backend.Infrastructure.Entities.Tokens;
using static Dapper.SqlMapper;

// A mapper class that maps the RefreshTokenModel to the RefreshJwtTokenEntity and vice versa.
// This is used to transition the RefreshTokenModel to the RefreshJwtTokenEntity, infrastructure layer to application layer and vice versa.
namespace Backend.Application.Mappers
{
    public static class RefreshTokenMapper
    {
        public static JwtRefreshTokenModel MapToDomainModel(RefreshJwtTokenEntity entity)
        {
            if (entity == null)
                return null;

            return new JwtRefreshTokenModel
            {
                Persoid = entity.Persoid,
                SessionId = entity.SessionId,
                RefreshToken = entity.RefreshToken,
                AccessTokenJti = entity.AccessTokenJti,
                RefreshTokenExpiryDate = entity.RefreshTokenExpiryDate,
                AccessTokenExpiryDate = entity.AccessTokenExpiryDate,
                DeviceId = entity.DeviceId,
                UserAgent = entity.UserAgent
            };
        }

        public static RefreshJwtTokenEntity MapToEntity(JwtRefreshTokenModel model)
        {
            if (model == null)
                return null;

            return new RefreshJwtTokenEntity
            {
                Persoid = model.Persoid,
                SessionId = model.SessionId,
                RefreshToken = model.RefreshToken,
                AccessTokenJti = model.AccessTokenJti,
                RefreshTokenExpiryDate = model.RefreshTokenExpiryDate,
                AccessTokenExpiryDate = model.AccessTokenExpiryDate,
                DeviceId = model.DeviceId,
                UserAgent = model.UserAgent,
                CreatedBy = "System",       
                CreatedTime = DateTime.UtcNow
            };
        }
    }
}
