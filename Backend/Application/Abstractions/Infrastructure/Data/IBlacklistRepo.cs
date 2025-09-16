namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface ITokenBlacklistRepo
{
    Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, CancellationToken ct);
    Task<bool> IsTokenBlacklistedAsync(string jti);

}