namespace Backend.Settings
{
    public class ExpiredTokenScannerSettings
    {
        public int ScanIntervalMinutes { get; set; }
        public bool LogWhenNoTokensFound { get; set; }
        public int HeartbeatIntervalMinutes { get; set; }
    }
}
