namespace Backend.Application.Settings
{
    public class WebSocketHealthCheckSettings
    {
        public bool Enabled { get; set; }
        public int MinimumActiveConnections { get; set; }
        public int IntervalSeconds { get; set; }
        public int HeartbeatIntervalMinutes { get; set; }
        public int MissedPongThreshold { get; set; }
        public bool LogoutOnStaleConnection { get; set; }
    }
}
