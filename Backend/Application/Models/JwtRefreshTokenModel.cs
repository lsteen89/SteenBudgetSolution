namespace Backend.Application.Models
{
    public class JwtRefreshTokenModel
    {
        public Guid Persoid { get; set; }
        public string SessionId { get; set; }
        public string RefreshToken { get; set; }
        public string AccessTokenJti { get; set; }
        public DateTime RefreshTokenExpiryDate { get; set; }
        public DateTime AccessTokenExpiryDate { get; set; }
        public string DeviceId { get; set; }
        public string UserAgent { get; set; }
    }
}
