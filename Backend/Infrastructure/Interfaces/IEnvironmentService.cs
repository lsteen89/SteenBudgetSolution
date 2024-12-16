namespace Backend.Infrastructure.Interfaces
{
    public interface IEnvironmentService
    {
        string GetEnvironmentVariable(string key);
    }
}
