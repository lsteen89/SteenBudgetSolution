namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBlacklistRepo
{
    Task<bool> AddBlacklistedTokenAsync(string jti, DateTime expiration, CancellationToken ct);
    Task<bool> IsTokenBlacklistedAsync(string jti);

}