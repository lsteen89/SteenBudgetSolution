namespace Backend.Application.Abstractions.Infrastructure.System
{
    public interface ITimeProvider
    {
        DateTime UtcNow { get; }
    }
}
