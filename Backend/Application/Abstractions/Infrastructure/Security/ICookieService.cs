namespace Backend.Application.Abstractions.Infrastructure.Security;

public interface ICookieService
{
    public record Cookie(string Name, string Value, CookieOptions Options);

    Cookie CreateRefreshCookie(string refreshToken, bool rememberMe);
    Cookie CreateDeleteCookie();
}