namespace Backend.Application.DTO.Auth
{
    public record AuthResult(
        string AccessToken,
        Guid PersoId,
        Guid SessionId,
        string WsMac,
        bool RememberMe
    );
}
