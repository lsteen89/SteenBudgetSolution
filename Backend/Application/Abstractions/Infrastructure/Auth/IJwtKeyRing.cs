using Microsoft.IdentityModel.Tokens;

namespace Backend.Application.Abstractions.Infrastructure.Auth;

public interface IJwtKeyRing
{
    string ActiveKid { get; }
    SymmetricSecurityKey ActiveKey { get; }                 // for signing
    IReadOnlyDictionary<string, SecurityKey> All { get; }   // for validation
}