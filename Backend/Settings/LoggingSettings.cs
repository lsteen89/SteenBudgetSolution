namespace Backend.Settings
{
    public static class LoggingSettings
    {
        public static bool MaskSensitiveData { get; set; }

        public static void Load(IConfiguration config, IHostEnvironment env)
        {
            // mask if we're running in Prod
            MaskSensitiveData = env.IsProduction();
        }
    }
}
