using Backend.Application.Configuration;

namespace Backend.Application.Interfaces.Cookies
{
    public interface ICookieService
    {
        void SetAuthCookie(string token, bool isSecure);
        void DeleteAuthCookie();
        void SetAuthCookies(HttpResponse response, string accessToken, string refreshToken);
    }
}
