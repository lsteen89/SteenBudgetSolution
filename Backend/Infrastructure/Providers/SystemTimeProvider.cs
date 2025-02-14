using Backend.Common.Interfaces;
using System;

namespace Backend.Infrastructure.Providers
{
    public class SystemTimeProvider : ITimeProvider
    {
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
