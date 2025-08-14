namespace Backend.Application.DTO.Auth
{
    public record AuthResult(
        string AccessToken,
        string RefreshToken,
        Guid PersoId,
        Guid SessionId,
        string WsMac,
        bool RememberMe
    );
}
