namespace Backend.Settings
{
    public class WebSocketHealthCheckSettings
    {
        public bool Enabled { get; set; } // Whether to enable the health check.
        public int MinimumActiveConnections { get; set; }   // Minimum number of active connections to run the health check.
        public int IntervalSeconds { get; set; } // How often to run the health check.
        public int HeartbeatIntervalMinutes { get; set; } // How often to log a heartbeat message.
        public int MissedPongThreshold { get; set; } // How many missed pongs before considering the connection stale.
        public bool LogoutOnStaleConnection { get; set; }   // Whether to log out users with stale connections.
        public TimeSpan PongTimeout { get; set; }  // How long to wait for a pong response before considering the connection stale.
    }
}
