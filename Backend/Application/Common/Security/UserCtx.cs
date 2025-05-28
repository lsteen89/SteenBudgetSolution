namespace Backend.Application.Common.Security
{
    /// <summary>
    /// Immutable user-context snapshot passed to token and auth services.
    /// </summary>
    public sealed record UserCtx(
        Guid Persoid,
        Guid SessionId,
        string DeviceId,
        string UserAgent,
        string Email,
        IReadOnlyList<string> Roles);

    /// <summary>
    /// Immutable result of access-token creation.  
    /// Records give you value-equality and `with`-expressions.
    /// </summary>
    public sealed record AccessTokenResult(
        string Token,
        string TokenJti,
        Guid SessionId,
        Guid Persoid,
        DateTime ExpiresUtc);

    public abstract record LoginOutcome
    {
        public sealed record Success(
            AccessTokenResult Access,
            string RefreshToken, Guid Persoid) : LoginOutcome;

        public sealed record Fail(string Error) : LoginOutcome;
    }
}
