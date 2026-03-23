namespace Backend.Application.DTO.User;

public sealed class UpdateUserProfileDto
{
    public string FirstName { get; init; } = default!;
    public string LastName { get; init; } = default!;
}