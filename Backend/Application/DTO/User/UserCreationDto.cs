using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.User
{
    public class UserCreationDto
    {
        [Required]
        public required string FirstName { get; set; }
        [Required]
        public required string LastName { get; set; }
        [Required]
        public required string Email { get; set; }
        [Required]
        public required string Password { get; set; }
        [Required]
        public required string CaptchaToken { get; set; }
        public string? Honeypot { get; set; }
    }
}
