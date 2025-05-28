namespace Backend.Application.Models.Token
{
    public class JwtAuthenticationTokens
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public Guid SessionId { get; set; }
        public string UserAgent { get; set; }
        public string DeviceId { get; set; }
    }
}
