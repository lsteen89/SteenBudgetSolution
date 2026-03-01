namespace Backend.IntegrationTests.E2E.Helpers;

public sealed record RegisterRequest(
    string firstName,
    string lastName,
    string email,
    string password,
    string humanToken,
    string? honeypot
);