namespace Backend.Application.Interfaces.Cookies
{
    public interface ICookieService
    {
        void SetRefreshCookie(HttpResponse res, string token);
        void DeleteRefreshCookie(HttpResponse res);

    }
}
