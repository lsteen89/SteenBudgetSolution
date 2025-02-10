using Backend.Application.Configuration;

namespace Backend.Application.Interfaces.Cookies
{
    public interface ICookieService
    {
        void SetAuthCookies(HttpResponse response, string accessToken, string refreshToken);
    }
}
