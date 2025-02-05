namespace Backend.Application.DTO
{
    public class RefreshTokenRequestDto
    {
        public Guid UserId { get; set; } 
        public string RefreshToken { get; set; }
    }
}
