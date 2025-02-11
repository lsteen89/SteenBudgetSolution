using Backend.Application.Configuration;

namespace Backend.Application.Interfaces.Cookies
{
    public interface ICookieService
    {
        void SetAuthCookies(HttpResponse response, string accessToken, string refreshToken, string sessionId);
        public string? GetCookieValue(HttpRequest request, string cookieName);
        public void DeleteCookie(HttpResponse response, string cookieName);
    }
}
