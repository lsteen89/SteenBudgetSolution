using Backend.Application.Interfaces.Cookies;
using Backend.Settings;
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
        public void SetAuthCookies(HttpResponse response, string accessToken, string refreshToken, string sessionId)
        {

            // Set the access token cookie.
            response.Cookies.Append("AccessToken", accessToken,
                CreateCookieOptions(DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes)));

            // Set the refresh token cookie.
            response.Cookies.Append("RefreshToken", refreshToken,
                CreateCookieOptions(DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)));

            // Set the session id cookie.
            response.Cookies.Append("SessionId", sessionId,
                CreateCookieOptions(DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes)));
        }
        private CookieOptions CreateCookieOptions(DateTime expires)
        {
            var options = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax,
                Expires = expires
            };

            // Only set the Domain if we're in Production and the host ends with "ebudget.se"
            if (_env.IsProduction() && _httpContextAccessor.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                options.Domain = ".ebudget.se";
            }

            return options;
        }
        // Retrieve a cookie value from the request.
        public string? GetCookieValue(HttpRequest request, string cookieName)
        {
            if (request.Cookies.TryGetValue(cookieName, out string cookieValue))
            {
                return cookieValue;
            }
            return null;
        }

        // Delete a cookie by name using consistent cookie options.
        public void DeleteCookie(HttpResponse response, string cookieName)
        {
            // Use the same Path (and Domain if applicable) as when the cookie was set.
            var options = new CookieOptions
            {
                Path = "/"
            };

            if (_env.IsProduction() && _httpContextAccessor.HttpContext?.Request.Host.Host.EndsWith("ebudget.se") == true)
            {
                options.Domain = ".ebudget.se";
            }

            response.Cookies.Delete(cookieName, options);
        }
    }
}