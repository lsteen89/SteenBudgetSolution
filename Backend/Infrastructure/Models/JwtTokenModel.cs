namespace Backend.Infrastructure.Models
{
    public class JwtTokenModel
    {
        public int Id { get; set; } // Primary key, auto-increment
        public Guid Persoid { get; set; }
        public string RefreshToken { get; set; } = string.Empty; // Hashed refresh token
        public DateTime ExpiryDate { get; set; }
        public string CreatedBy { get; set; } = "System";
        public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    }
}
