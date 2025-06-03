namespace Backend.Application.Interfaces.Cookies
{
    public interface ICookieService
    {
        void SetRefreshCookie(HttpResponse res, string token, bool rememberMe);
        void DeleteRefreshCookie(HttpResponse res);

    }
}
