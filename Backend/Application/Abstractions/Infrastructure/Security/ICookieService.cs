namespace Backend.Application.Abstractions.Infrastructure.Security;

public interface ICookieService
{
    // A simple record to hold the cookie data. Can live in this file.
    public record Cookie(string Name, string Value, CookieOptions Options);

    Cookie CreateRefreshCookie(string refreshToken, bool rememberMe);
    Cookie CreateDeleteCookie();
}
