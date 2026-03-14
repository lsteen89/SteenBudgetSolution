namespace Backend.Domain.Common.Constants;

public static class AppLocales
{
    public const string Swedish = "sv-SE";
    public const string English = "en-US";
    public const string Estonian = "et-EE";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Swedish,
        English,
        Estonian
    };

    public static bool IsSupported(string? value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value);
}