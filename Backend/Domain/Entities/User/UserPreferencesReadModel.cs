namespace Backend.Domain.Entities.User;

public sealed class UserPreferencesReadModel
{
    public string Locale { get; init; } = "en-US";
    public string Currency { get; init; } = "EUR";
}