using Backend.Domain.Common.Constants;

namespace Backend.Application.DTO.User.Models;

public sealed class UserPreferencesDto
{
    public string Locale { get; init; } = AppLocales.English;
    public string Currency { get; init; } = AppCurrencies.Eur;
}