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
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes)
            };
            response.Cookies.Append("AccessToken", accessToken, accessCookieOptions);

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
            };
            response.Cookies.Append("RefreshToken", refreshToken, refreshCookieOptions);
        }
        // TODO: Delete this, used only for testing purposes.
        public void SetAuthCookie(string token, bool isSecure)
        {
            if (_httpContextAccessor.HttpContext == null)
                throw new InvalidOperationException("No active HTTP context.");

            _httpContextAccessor.HttpContext.Response.Cookies.Append("auth_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddHours(1)
            });
        }
        public void DeleteAuthCookie()
        {
            if (_httpContextAccessor.HttpContext == null)
                throw new InvalidOperationException("No active HTTP context.");

            var response = _httpContextAccessor.HttpContext.Response;

            response.Cookies.Delete("auth_token", new CookieOptions
            {
                Path = "/",
                Domain = "ebudget.se"
            });
        }
    }
}