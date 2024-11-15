namespace Backend.Application.Settings
{
    public class ResendEmailSettings
    {
        public int CooldownPeriodMinutes { get; set; }
        public int DailyLimit { get; set; }
    }
}
