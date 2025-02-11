namespace Backend.Application.Models
{
    public class JwtAuthenticationTokens
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public string SessionId { get; set; }
        public string UserAgent { get; set; }
        public string DeviceId { get; set; }
    }
}
