using Backend.Application.Configuration;
using Backend.Application.Interfaces.Cookies;

namespace Backend.Infrastructure.Services.CookieService
{
    public class CookieService : ICookieService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly JwtSettings _jwtSettings;

        public CookieService(IHttpContextAccessor httpContextAccessor, JwtSettings jwtSettings)
        {
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
                Domain = ".ebudget.se",
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes)
            };
            response.Cookies.Append("AccessToken", accessToken, accessCookieOptions);

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Domain = ".ebudget.se",
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
            };
            response.Cookies.Append("RefreshToken", refreshToken, refreshCookieOptions);
        }
    }
}