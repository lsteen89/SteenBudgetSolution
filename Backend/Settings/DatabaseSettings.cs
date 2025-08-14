namespace Backend.Settings
{
    public class DatabaseSettings
    {
        public string ConnectionString { get; set; } = string.Empty;
        public int DefaultCommandTimeoutSeconds { get; set; } = 30;
    }
}
