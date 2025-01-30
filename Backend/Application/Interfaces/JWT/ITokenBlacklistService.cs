namespace Backend.Application.Interfaces.JWT
{
    public interface ITokenBlacklistService
    {
        Task BlacklistTokenAsync(string jti, DateTime expiration);
        Task<bool> IsTokenBlacklistedAsync(string jti);
    }
}
