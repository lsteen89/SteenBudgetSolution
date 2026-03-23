namespace Backend.Domain.Common.Constants;

public static class AppCurrencies
{
    public const string Eur = "EUR";
    public const string Sek = "SEK";
    public const string Usd = "USD";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Eur,
        Sek,
        Usd
    };

    public static bool IsSupported(string? value) =>
        !string.IsNullOrWhiteSpace(value) && All.Contains(value);
}