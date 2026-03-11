namespace Backend.Application.Validators.Locale;

public static class UserLocale
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    { "sv-SE", "en-US", "et-EE" };

    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "sv-SE";
        return Allowed.Contains(input) ? input : "sv-SE";
    }
}