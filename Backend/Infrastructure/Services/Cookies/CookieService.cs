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

        public void SetRefreshCookie(HttpResponse res, string refreshToken)
        {
            res.Cookies.Append("RefreshToken", refreshToken, BuildOptions(
                DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute)));
        }

        public void DeleteRefreshCookie(HttpResponse res)
            => res.Cookies.Delete("RefreshToken", BuildOptions(DateTime.UnixEpoch));

        /* ---------- private ---------- */
        CookieOptions BuildOptions(DateTime expiresUtc)
        {
            var opt = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Path = "/",
                Expires = expiresUtc
            };

            if (_env.IsProduction() &&
                _ctx.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                opt.Domain = ".ebudget.se";
            }
            return opt;
        }
    }

}