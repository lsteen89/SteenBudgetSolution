namespace Backend.Application.Settings
{
    public class WebSocketHealthCheckSettings
    {
        public bool Enabled { get; set; }
        public int MinimumActiveConnections { get; set; }
        public int IntervalSeconds { get; set; }
    }
}
