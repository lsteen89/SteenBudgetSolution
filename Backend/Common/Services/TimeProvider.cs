using Backend.Common.Interfaces;

namespace Backend.Common.Services
{
    public class TimeProvider : ITimeProvider
    {
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
