using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.User
{
    public class UserLoginDto
    {
        [Required]
        public required string Email { get; set; }

        [Required]
        public required string Password { get; set; }
        [Required]
        public required string CaptchaToken { get; set; }
        public bool RememberMe { get; set; }
    }
}
