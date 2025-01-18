namespace Backend.Application.DTO
{
    public class AuthStatusDto
    {
        public bool Authenticated { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
    }
}
