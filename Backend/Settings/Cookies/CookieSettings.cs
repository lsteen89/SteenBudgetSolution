using Microsoft.AspNetCore.Http;

namespace Backend.Settings.cookies;

public sealed class CookieSettings
{
    public const string SectionName = "Cookies";

    public string RefreshCookieName { get; set; } = CookieNames.RefreshToken;
    public bool Secure { get; set; } = true;
    public bool HttpOnly { get; set; } = true;
    public SameSiteMode SameSite { get; set; } = SameSiteMode.Strict;
    public string Path { get; set; } = "/";
    public string? Domain { get; set; }
    public int? SessionDays { get; set; }
}