namespace Backend.Application.Interfaces.JWT
{
    public interface ITokenBlacklistService
    {
        Task<bool> BlacklistTokenAsync(string jti, DateTime expiration);
        Task<bool> BlacklistTokenByJtiAsync(string jti, DateTime accessTokenExpiryDate);
        Task<bool> IsTokenBlacklistedAsync(string jti);
    }
}
