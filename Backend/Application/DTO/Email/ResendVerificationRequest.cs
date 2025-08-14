using System.ComponentModel.DataAnnotations;

namespace Backend.Application.DTO.Email
{
    public class ResendVerificationRequest
    {
        [Required]
        public required string Email { get; set; }
    }
}
