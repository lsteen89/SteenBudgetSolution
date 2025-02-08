using Backend.Infrastructure.Interfaces;

namespace Backend.Common.Utilities
{
    public class EnvironmentService : IEnvironmentService
    {
        private readonly IConfiguration _configuration;

        public EnvironmentService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GetEnvironmentVariable(string key)
        {
            // Only use environment variable or mock for tests
            return Environment.GetEnvironmentVariable(key) ?? _configuration[key];
        }
    }
}
