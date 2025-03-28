using System.Data.Common;

namespace Backend.Application.Interfaces.JWT
{
    public interface ITokenBlacklistService
    {
        Task<bool> BlacklistTokenAsync(string jti, DateTime expiration);
        Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate, DbTransaction tx);
        Task<bool> IsTokenBlacklistedAsync(string jti);
        Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti);
    }
}
