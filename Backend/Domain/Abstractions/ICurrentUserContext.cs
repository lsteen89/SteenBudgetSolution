namespace Backend.Domain.Abstractions
{
    public interface ICurrentUserContext
    {
        Guid Persoid { get; }
        string UserName { get; } // Email as of now
    }
}
