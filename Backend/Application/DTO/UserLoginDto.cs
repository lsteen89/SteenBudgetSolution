namespace Backend.Application.DTO
{
    public class UserLoginDto
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? CaptchaToken { get; set; }
        public bool FirstLogin { get; set; }

    }
}
