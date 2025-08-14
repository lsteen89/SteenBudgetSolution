using System.ComponentModel.DataAnnotations;

namespace Backend.Domain.Auth
{
    public sealed record TokenRequestDto(
        [Required] string AccessToken,
        [Required] string RefreshToken,
        Guid SessionId,
        string? Jti);

}
