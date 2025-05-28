namespace Backend.Settings
{
    public class JwtSettings
    {
        public string Issuer { get; set; } = "eBudget";
        public string Audience { get; set; } = "eBudget";
        public string SecretKey { get; set; } = string.Empty;
        public int ExpiryMinutes { get; set; }
        public int RefreshTokenExpiryDays { get; set; }
        public int RefreshTokenExpiryDaysAbsolute { get; set; }
    }
}
