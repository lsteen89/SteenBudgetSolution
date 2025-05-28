namespace Backend.Domain.Auth
{
    public sealed record TokenRequestDto(
        string? AccessToken,
        string? RefreshToken,
        Guid SessionId,
        string? Jti);

}
