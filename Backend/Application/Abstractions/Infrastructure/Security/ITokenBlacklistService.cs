namespace Backend.Application.Abstractions.Infrastructure.Security
{
    public interface ITokenBlacklistService
    {
        Task<bool> BlacklistTokenAsync(string jti, DateTime expiration, CancellationToken ct);
        Task<bool> IsTokenBlacklistedAsync(string jti, CancellationToken ct);
        Task<bool> DoesAccessTokenJtiExistAsync(string accessTokenJti, CancellationToken ct);
    }
}
