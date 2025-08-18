namespace Backend.Domain.Shared;
public class DuplicateKeyException : Exception
{
    public DuplicateKeyException(string message, Exception innerException)
        : base(message, innerException) { }
}