using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Token
{
    public class RefreshTokenRequestDto
    {
        [Required]
        public required string RefreshToken { get; set; }
    }
}
