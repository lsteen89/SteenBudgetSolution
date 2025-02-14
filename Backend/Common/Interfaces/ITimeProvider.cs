namespace Backend.Common.Interfaces
{
    public interface ITimeProvider
    {
        DateTime UtcNow { get; }
    }
}
