namespace Backend.Application.Helpers.Currency;

internal static class CurrencyHelper
{

    public static string NormalizeCurrencyOrDefault(string? currency, string fallback)
    {
        if (string.IsNullOrWhiteSpace(currency))
            return fallback;

        var normalized = currency.Trim().ToUpperInvariant();

        return normalized is "SEK" or "USD" or "EUR"
            ? normalized
            : fallback;
    }
}