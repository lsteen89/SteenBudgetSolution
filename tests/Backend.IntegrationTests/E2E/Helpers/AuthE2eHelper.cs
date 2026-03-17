using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Application.DTO.Auth;
using Backend.Application.DTO.Email;
using Backend.Presentation.Shared;
using Dapper;
using FluentAssertions;
using MySqlConnector;

namespace Backend.IntegrationTests.E2E.Helpers;

public static class AuthE2eHelper
{
    public static async Task<UserSession> RegisterUserAsync(
        HttpClient client,
        string connectionString,
        string email,
        string password,
        string firstName = "Test",
        string lastName = "User",
        string humanToken = "test-token",
        string? honeypot = "",
        bool verifyEmail = true)
    {
        var registerResponse = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest(
                firstName,
                lastName,
                email,
                password,
                humanToken,
                honeypot
            ));

        var registerBody = await registerResponse.Content.ReadAsStringAsync();
        if (registerResponse.StatusCode != HttpStatusCode.Created)
            throw new Exception(
                $"Register failed: {(int)registerResponse.StatusCode} {registerResponse.StatusCode}\n{registerBody}");

        var registerEnvelope = await registerResponse.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        registerEnvelope.Should().NotBeNull();
        registerEnvelope!.IsSuccess.Should().BeTrue();
        registerEnvelope.Data.Should().NotBeNull();
        registerEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        registerEnvelope.Data.PersoId.Should().NotBe(Guid.Empty);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", registerEnvelope.Data.AccessToken);

        if (!verifyEmail)
        {
            return new UserSession(
                client,
                email,
                password,
                registerEnvelope.Data.PersoId,
                registerEnvelope.Data.AccessToken,
                null,
                false,
                registerEnvelope.Data,
                null
            );
        }

        var verificationCode = await ReadLatestVerificationCodeAsync(connectionString, email);

        var verifyResponse = await client.PostAsJsonAsync(
            "/api/auth/verify-email-code",
            new VerifyEmailCodeRequest(verificationCode));

        var verifyBody = await verifyResponse.Content.ReadAsStringAsync();
        if (verifyResponse.StatusCode != HttpStatusCode.OK)
            throw new Exception(
                $"Verify failed: {(int)verifyResponse.StatusCode} {verifyResponse.StatusCode}\n{verifyBody}");

        var verifyEnvelope = await verifyResponse.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult>>();
        verifyEnvelope.Should().NotBeNull();
        verifyEnvelope!.IsSuccess.Should().BeTrue();
        verifyEnvelope.Data.Should().NotBeNull();
        verifyEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        verifyEnvelope.Data.PersoId.Should().Be(registerEnvelope.Data.PersoId);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", verifyEnvelope.Data.AccessToken);

        return new UserSession(
            client,
            email,
            password,
            registerEnvelope.Data.PersoId,
            registerEnvelope.Data.AccessToken,
            verifyEnvelope.Data.AccessToken,
            true,
            registerEnvelope.Data,
            verifyEnvelope.Data
        );
    }

    private static async Task<string> ReadLatestVerificationCodeAsync(
        string connectionString,
        string email)
    {
        await using var conn = new MySqlConnection(connectionString);
        await conn.OpenAsync();

        var deadline = DateTime.UtcNow.AddSeconds(5);
        while (DateTime.UtcNow < deadline)
        {
            var bodyHtml = await conn.QueryFirstOrDefaultAsync<string>(
                """
                SELECT BodyHtml
                FROM EmailOutbox
                WHERE ToEmail = @to AND Kind = 'VerificationCode'
                ORDER BY Id DESC
                LIMIT 1;
                """,
                new { to = email });

            if (!string.IsNullOrWhiteSpace(bodyHtml))
                return E2eTestHelpers.Extract6DigitCode(bodyHtml);

            await Task.Delay(100);
        }

        throw new TimeoutException($"No verification email found for {email}.");
    }
}

public sealed record UserSession(
    HttpClient Client,
    string Email,
    string Password,
    Guid PersoId,
    string OnboardingAccessToken,
    string? VerifiedAccessToken,
    bool IsVerified,
    AuthResult OnboardingAuth,
    AuthResult? VerifiedAuth
);