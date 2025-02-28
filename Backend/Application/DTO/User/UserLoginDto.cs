namespace Backend.Application.DTO.User
{
    public class UserLoginDto
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? CaptchaToken { get; set; }

    }
}
