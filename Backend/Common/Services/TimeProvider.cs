using Backend.Application.Abstractions.Infrastructure.System;

namespace Backend.Common.Services
{
    public class TimeProvider : ITimeProvider
    {
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
