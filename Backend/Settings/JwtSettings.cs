namespace Backend.Settings
{
    public sealed class JwtSettings
    {
        public string Issuer { get; set; } = "eBudget";
        public string Audience { get; set; } = "eBudget";
        public int ExpiryMinutes { get; set; } = 15;

        public string ActiveKid { get; set; } = default!;
        public Dictionary<string, string> Keys { get; set; } = new();

        public int RefreshTokenExpiryDays { get; set; } = 30;
        public int RefreshTokenExpiryDaysAbsolute { get; set; } = 90;
    }
}
