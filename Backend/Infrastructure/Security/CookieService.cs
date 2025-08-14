using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Settings;

namespace Backend.Infrastructure.Security
{
    public sealed class CookieService : ICookieService
    {
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _ctx;
        private readonly JwtSettings _jwtSettings;

        public CookieService(IWebHostEnvironment env,
                             IHttpContextAccessor ctx,
                            JwtSettings jwtSettings)
        {
            _env = env;
            _ctx = ctx;
            _jwtSettings = jwtSettings;
        }

        public ICookieService.Cookie CreateRefreshCookie(string refreshToken, bool rememberMe)
        {
            DateTimeOffset? expiryDate = rememberMe
                ? DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute)
                : null;

            var options = BuildOptions(expiryDate);

            return new ICookieService.Cookie("RefreshToken", refreshToken, options);
        }

        public ICookieService.Cookie CreateDeleteCookie()
        {
            var options = BuildOptions(DateTimeOffset.UtcNow.AddDays(-1));

            return new ICookieService.Cookie("RefreshToken", "", options);
        }

        /* ---------- private ---------- */
        private CookieOptions BuildOptions(DateTimeOffset? expiresUtc = null)
        {
            var opt = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // Good practice: always true if possible (requires HTTPS)
                SameSite = SameSiteMode.Strict,
                Path = "/", // Todo: Maybe if "/" is too broad. "/api/auth" might be more specific if applicable.
            };

            if (expiresUtc.HasValue)
            {
                opt.Expires = expiresUtc.Value;
            }

            if (_env.IsProduction() &&
                _ctx.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                opt.Domain = ".ebudget.se";
            }
            return opt;
        }
    }

}