namespace Backend.Application.DTO.User;

public sealed class UpdateUserPreferencesDto
{
    public string Locale { get; init; } = default!;
    public string Currency { get; init; } = default!;
}