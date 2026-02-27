namespace Backend.Application.DTO.User
{
    public sealed class UserLoginDto
    {
        public required string Email { get; init; }
        public required string Password { get; init; }

        // optional: only present when challenge is shown / needed
        public string? HumanToken { get; init; }

        public bool RememberMe { get; init; }
    }
}