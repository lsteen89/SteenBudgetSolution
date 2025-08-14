using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Auth
{
    public class ResetPasswordRequest
    {
        [Required]
        public required string Email { get; set; }
    }
}
