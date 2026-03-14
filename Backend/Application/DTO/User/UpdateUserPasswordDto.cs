namespace Backend.Application.DTO.User;

public sealed class UpdateUserPasswordDto
{
    public string CurrentPassword { get; init; } = default!;
    public string NewPassword { get; init; } = default!;
}