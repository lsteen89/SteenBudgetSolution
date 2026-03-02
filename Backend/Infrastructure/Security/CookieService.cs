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

            return new ICookieService.Cookie("ebudget_rt", refreshToken, options);
        }

        public ICookieService.Cookie CreateDeleteCookie()
        {
            var options = BuildOptions(DateTimeOffset.UtcNow.AddDays(-1));

            return new ICookieService.Cookie("ebudget_rt", "", options);
        }

        /* ---------- private ---------- */
        private CookieOptions BuildOptions(DateTimeOffset? expiresUtc = null)
        {
            var isDev = _env.IsDevelopment();

            var opt = new CookieOptions
            {
                HttpOnly = true,
                Secure = !isDev, // dev can be false if you run http
                SameSite = isDev ? SameSiteMode.Lax : SameSiteMode.Strict,
                Path = "/",
            };

            if (expiresUtc.HasValue) opt.Expires = expiresUtc.Value;

            if (_env.IsProduction() &&
                _ctx.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                opt.Domain = ".ebudget.se";
                opt.Secure = true;
                opt.SameSite = SameSiteMode.None; // IMPORTANT if frontend is on a different subdomain
            }

            return opt;
        }
    }

}