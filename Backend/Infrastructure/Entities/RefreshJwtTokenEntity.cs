namespace Backend.Infrastructure.Entities
{
    public class RefreshJwtTokenEntity
    {
        public int Id { get; set; } // Primary key, auto-increment
        public Guid Persoid { get; set; }
        public string RefreshToken { get; set; } = string.Empty;
        public string AccessTokenJti { get; set; } = string.Empty;
        public DateTime RefreshTokenExpiryDate { get; set; }
        public DateTime AccessTokenExpiryDate { get; set; }
        public string DeviceId { get; set; } = string.Empty;
        public string UserAgent { get; set; } = string.Empty; 
        public string CreatedBy { get; set; } = "System";
        public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    }
}
