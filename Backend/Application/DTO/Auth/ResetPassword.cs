using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Auth
{
    public class ResetPassword
    {
        public Guid Token { get; set; }
        [Required]
        public required string Password { get; set; }
        [Required]
        public required string ConfirmPassword { get; set; }
    }
}
