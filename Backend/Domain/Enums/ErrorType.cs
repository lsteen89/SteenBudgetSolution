namespace Backend.Domain.Enums;
/// <summary>
/// Defines the category of a domain error.
/// </summary>
public enum ErrorType
{
    /// <summary>
    /// A validation error, typically results in HTTP 400.
    /// </summary>
    Validation,

    /// <summary>
    /// A "not found" error, typically results in HTTP 404.
    /// </summary>
    NotFound,

    /// <summary>
    /// A conflict error, typically results in HTTP 409.
    /// </summary>
    Conflict,

    /// <summary>
    /// An authorization error, typically results in HTTP 401/403.
    /// </summary>
    Unauthorized
}