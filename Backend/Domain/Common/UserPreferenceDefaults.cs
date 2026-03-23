using Backend.Domain.Common.Constants;

namespace Backend.Domain.Common;

public static class UserPreferenceDefaults
{
    public static string NormalizeLocaleOrDefault(string? locale) =>
        AppLocales.IsSupported(locale) ? locale! : AppLocales.Swedish; // deliberate choice for my audience, and fallback to a reasonable default

    public static string GetDefaultCurrencyForLocale(string? locale) =>
        locale switch
        {
            AppLocales.Swedish => AppCurrencies.Sek,
            AppLocales.Estonian => AppCurrencies.Eur,
            AppLocales.English => AppCurrencies.Eur, // deliberate choice for my audience
            _ => AppCurrencies.Sek // fallback to a reasonable default
        };
}