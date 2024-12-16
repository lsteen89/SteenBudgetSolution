using Backend.Infrastructure.Interfaces;

namespace Backend.Infrastructure.Helpers
{
    public class EnvironmentService : IEnvironmentService
    {
        public string GetEnvironmentVariable(string key)
        {
            return Environment.GetEnvironmentVariable(key);
        }
    }
}
