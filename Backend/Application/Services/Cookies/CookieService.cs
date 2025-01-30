using Backend.Application.Interfaces.Cookies;

public class CookieService : ICookieService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CookieService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

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