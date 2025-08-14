namespace Backend.Domain.Shared;

/// <summary>
/// Represents a specific domain error with a code and a description.
/// </summary>
public record Error(string Code, string Description)
{
    /// <summary>
    /// Represents a non-error. This is the default state.
    /// </summary>
    public static readonly Error None = new(string.Empty, string.Empty);

    /// <summary>
    /// Represents an error for a null value.
    /// </summary>
    public static readonly Error NullValue = new("Error.NullValue", "Provided value is null.");
}