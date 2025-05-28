namespace Backend.Application.DTO.Auth
{
    public record AuthResult(
        bool Success,
        string AccessToken,
        Guid Persoid,
        Guid SessionId,
        string WsMac);
}
