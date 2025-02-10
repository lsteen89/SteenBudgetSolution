using Backend.Application.Configuration;
using Backend.Application.Interfaces.Cookies;
using Microsoft.Extensions.Hosting;
namespace Backend.Infrastructure.Services.CookieService
{
    public class CookieService : ICookieService
    {
        private readonly IWebHostEnvironment _env;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtSettings _jwtSettings;

        public CookieService(IWebHostEnvironment env, IHttpContextAccessor httpContextAccessor, JwtSettings jwtSettings)
        {
            _env = env;
            _httpContextAccessor = httpContextAccessor;
            _jwtSettings = jwtSettings;
        }
        public void SetAuthCookies(HttpResponse response, string accessToken, string refreshToken)
        {
            var accessCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes)
            };

            // Only set the Domain if we are in production AND the current host is not localhost
            if (_env.IsProduction() && _httpContextAccessor.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                accessCookieOptions.Domain = ".ebudget.se";
            }

            response.Cookies.Append("AccessToken", accessToken, accessCookieOptions);

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
            };

            if (_env.IsProduction() && _httpContextAccessor.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                refreshCookieOptions.Domain = ".ebudget.se";
            }

            response.Cookies.Append("RefreshToken", refreshToken, refreshCookieOptions);
        }

    }
}