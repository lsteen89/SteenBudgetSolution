
using Backend.Application.DTO.Auth;

namespace Backend.Application.Features.Authentication.Shared.Models;

public record IssuedAuthSession(
    AuthResult Result,
    string RefreshToken // internal only, used for cookie
);