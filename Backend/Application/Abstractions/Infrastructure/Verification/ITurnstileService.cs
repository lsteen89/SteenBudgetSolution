
namespace Backend.Application.Abstractions.Infrastructure.Verification;

public interface ITurnstileService
{
    Task<bool> ValidateAsync(string token, string? remoteIp, CancellationToken ct);
}
