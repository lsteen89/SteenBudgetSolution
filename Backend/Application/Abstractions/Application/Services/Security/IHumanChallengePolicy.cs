namespace Backend.Application.Abstractions.Application.Services.Security;

public interface IHumanChallengePolicy
{
    Task<bool> ShouldRequireAsync(string emailNorm, string? remoteIp, string? userAgent, CancellationToken ct);
}