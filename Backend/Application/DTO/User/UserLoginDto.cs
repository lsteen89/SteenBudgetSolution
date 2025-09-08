using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.User
{
    public class UserLoginDto
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string CaptchaToken { get; set; }
        public bool RememberMe { get; set; }
    }
}
