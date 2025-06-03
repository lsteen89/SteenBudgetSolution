using Backend.Application.Interfaces.Cookies;
using Backend.Settings;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
namespace Backend.Infrastructure.Services.CookieService
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

        public void SetRefreshCookie(HttpResponse res, string refreshToken, bool rememberMe)
        {
            DateTimeOffset? expiryDate = null;
            if (rememberMe)
            {
                expiryDate = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute);
            }

            // If rememberMe is false, expiryDate remains null, leading to a session cookie
            res.Cookies.Append("RefreshToken", refreshToken, BuildOptions(expiryDate));
        }

        public void DeleteRefreshCookie(HttpResponse res)
        {
            res.Cookies.Append("RefreshToken", "", BuildOptions(DateTimeOffset.UtcNow.AddDays(-1)));
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