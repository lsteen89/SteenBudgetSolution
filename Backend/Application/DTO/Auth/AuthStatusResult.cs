namespace Backend.Application.DTO.Auth
{
    public record AuthStatusResult
    {
        public bool Authenticated { get; init; }
        public string AccessToken { get; init; }
        public Guid SessionId { get; init; }
        public Guid Persoid { get; init; }
        public DateTime ExpiresUtc { get; init; } // Rolling expiration time for the refresh token
        public string? NewRefreshCookie { get; init; }
        public CookieOptions? CookieOptions { get; init; }

        public static AuthStatusResult Fail() =>
            new() { Authenticated = false };

        public static AuthStatusResult Success(
            string access, Guid sessionId, Guid persoid, DateTime expiresUtc, string? refreshCookie = null
        ) => new()
        {
            Authenticated = true,
            AccessToken = access,
            SessionId = sessionId,
            Persoid = persoid,
            ExpiresUtc = expiresUtc,
            NewRefreshCookie = refreshCookie,

            CookieOptions = refreshCookie == null ? null :
                                  /* create httpOnly / Secure / SameSite=Strict opts */
                                  new CookieOptions
                                  {
                                      HttpOnly = true,
                                      Secure = true,
                                      SameSite = SameSiteMode.Strict,
                                      Expires = DateTime.UtcNow.AddDays(30) // TODO FIX THIS
                                  }
        };
    }
}
