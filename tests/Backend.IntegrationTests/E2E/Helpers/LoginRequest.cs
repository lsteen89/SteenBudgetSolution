namespace Backend.IntegrationTests.E2E.Helpers;

public sealed record LoginRequest(
    string Email,
    string Password,
    string? HumanToken,
    bool RememberMe
);