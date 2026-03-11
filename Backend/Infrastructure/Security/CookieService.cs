using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Settings;
using Backend.Settings.cookies;
using Microsoft.Extensions.Options;

namespace Backend.Infrastructure.Security;

public sealed class CookieService : ICookieService
{
    private readonly CookieSettings _cookieSettings;
    private readonly JwtSettings _jwtSettings;

    public CookieService(
        IOptions<CookieSettings> cookieOptions,
        JwtSettings jwtSettings)
    {
        _cookieSettings = cookieOptions.Value;
        _jwtSettings = jwtSettings;

        Console.WriteLine(
    $"CookieSettings => Secure={_cookieSettings.Secure}, SameSite={_cookieSettings.SameSite}, Path={_cookieSettings.Path}, Domain={_cookieSettings.Domain}");
    }

    public ICookieService.Cookie CreateRefreshCookie(string refreshToken, bool rememberMe)
    {
        DateTimeOffset? expiresUtc = rememberMe
            ? DateTimeOffset.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDaysAbsolute)
            : _cookieSettings.SessionDays is int days
                ? DateTimeOffset.UtcNow.AddDays(days)
                : null;

        var options = BuildOptions(expiresUtc);

        return new ICookieService.Cookie(
            _cookieSettings.RefreshCookieName,
            refreshToken,
            options);
    }

    public ICookieService.Cookie CreateDeleteCookie()
    {
        var options = BuildOptions(DateTimeOffset.UtcNow.AddDays(-1));

        return new ICookieService.Cookie(
            _cookieSettings.RefreshCookieName,
            string.Empty,
            options);
    }

    private CookieOptions BuildOptions(DateTimeOffset? expiresUtc = null)
    {
        var opt = new CookieOptions
        {
            HttpOnly = _cookieSettings.HttpOnly,
            Secure = _cookieSettings.Secure,
            SameSite = _cookieSettings.SameSite,
            Path = _cookieSettings.Path
        };

        if (!string.IsNullOrWhiteSpace(_cookieSettings.Domain))
            opt.Domain = _cookieSettings.Domain;

        if (expiresUtc.HasValue)
            opt.Expires = expiresUtc.Value;

        return opt;
    }
}