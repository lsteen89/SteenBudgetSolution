namespace Backend.Domain.Filters;

public sealed record RefreshTokenFilter(
    Guid? PersoId = null,
    string? HashedToken = null,
    Guid? SessionId = null);
