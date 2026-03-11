
namespace Backend.Application.DTO.User
{
    public class UserCreationDto
    {
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string HumanToken { get; set; }
        public string? Honeypot { get; set; }
        public string Locale { get; init; } = "sv-SE"; // default fallback
    }

}
