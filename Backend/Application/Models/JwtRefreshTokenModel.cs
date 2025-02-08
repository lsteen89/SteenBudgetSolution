namespace Backend.Application.Models
{
    public class JwtRefreshTokenModel
    {
        public Guid Persoid { get; set; }
        public string RefreshToken { get; set; }
        public DateTime ExpiryDate { get; set; }
        public string DeviceId { get; set; }
        public string UserAgent { get; set; }
    }
}
