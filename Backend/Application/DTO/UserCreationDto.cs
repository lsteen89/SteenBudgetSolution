namespace Backend.Application.DTO
{
    public class UserCreationDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? CaptchaToken { get; set; }
    }
}
