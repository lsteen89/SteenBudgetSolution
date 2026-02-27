using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Domain.Entities.User;

namespace Backend.Application.Features.Shared.Issuers.Auth;

public interface IAuthSessionIssuer
{
    Task<IssuedAuthSession> IssueAsync(
        UserModel user,
        bool rememberMe,
        string deviceId,
        string userAgent,
        CancellationToken ct);
}
