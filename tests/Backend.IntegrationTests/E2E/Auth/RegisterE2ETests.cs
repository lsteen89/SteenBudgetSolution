using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.IntegrationTests.TestHost;
using FluentAssertions;
using Backend.Application.DTO.Email;
using Backend.IntegrationTests.Shared;
using Dapper;
using Microsoft.AspNetCore.Mvc.Testing;
using Backend.Presentation.Shared;
using Backend.Application.DTO.Auth;
using Backend.Application.Constants;
using System.IdentityModel.Tokens.Jwt;
using Backend.Application.DTO.User;

namespace Backend.IntegrationTests.E2E.Auth;

[Collection("it:db")]
public sealed class RegisterE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public RegisterE2ETests(MariaDbFixture db)
    {
        _db = db;
        _factory = new ApiFactory(db);
    }

    [Fact]
    public async Task Register_verify_login_happy_path()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"e2e_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        var req = new RegisterRequest(
            firstName: "Test",
            lastName: "Testsson",
            email: email,
            password: password,
            humanToken: "test-token",
            honeypot: ""
        );

        // Register
        var reg = await client.PostAsJsonAsync("/api/auth/register", req);
        var regBody = await reg.Content.ReadAsStringAsync();

        if (reg.StatusCode != HttpStatusCode.Created)
            throw new Exception($"Register failed: {(int)reg.StatusCode} {reg.StatusCode}\n{regBody}");

        var regEnvelope = await reg.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        regEnvelope.Should().NotBeNull();
        regEnvelope!.IsSuccess.Should().BeTrue();
        regEnvelope.Data.Should().NotBeNull();
        regEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", regEnvelope.Data.AccessToken);

        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var queued = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM EmailOutbox WHERE ToEmail=@to AND Kind='VerificationCode';",
            new { to = email });

        queued.Should().BeGreaterThan(0);

        var bodyHtml = await conn.ExecuteScalarAsync<string>(
            @"SELECT BodyHtml
          FROM EmailOutbox
          WHERE ToEmail=@to AND Kind='VerificationCode'
          ORDER BY Id DESC
          LIMIT 1;",
            new { to = email });

        bodyHtml.Should().NotBeNullOrWhiteSpace();
        var code = E2eTestHelpers.Extract6DigitCode(bodyHtml!);

        // Verify - authenticated onboarding call
        var verify = await client.PostAsJsonAsync(
            "/api/auth/verify-email-code",
            new VerifyEmailCodeRequest(code));

        var verifyBody = await verify.Content.ReadAsStringAsync();
        if (verify.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Verify failed: {(int)verify.StatusCode} {verify.StatusCode}\n{verifyBody}");

        // Login
        client.DefaultRequestHeaders.Authorization = null;

        var loginReq = new LoginRequest(
            Email: email,
            Password: password,
            HumanToken: null,
            RememberMe: false
        );

        var login = await client.PostAsJsonAsync("/api/auth/login", loginReq);
        var loginBody = await login.Content.ReadAsStringAsync();

        if (login.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login failed: {(int)login.StatusCode} {login.StatusCode}\n{loginBody}");
    }

    [Fact]
    public async Task Anonymous_cannot_verify_email_code()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var verify = await client.PostAsJsonAsync(
            "/api/auth/verify-email-code",
            new VerifyEmailCodeRequest("123456"));

        verify.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Anonymous_cannot_call_resend_verification()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var resend = await client.PostAsync("/api/auth/resend-verification", content: null);

        resend.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Anonymous_can_call_resend_verification_recovery()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"recovery_{Guid.NewGuid():N}@test.local";

        var resend = await client.PostAsJsonAsync(
            "/api/auth/resend-verification-recovery",
            new ResendVerificationRecoveryRequest(email));

        var body = await resend.Content.ReadAsStringAsync();
        if (resend.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Recovery resend failed: {(int)resend.StatusCode} {resend.StatusCode}\n{body}");

        var envelope = await resend.Content.ReadFromJsonAsync<ApiEnvelope<string>>();
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Data.Should().NotBeNullOrWhiteSpace();
    }

    private static async Task<CapturedEmail> WaitForEmailAsync(IEmailCapture capture, string to, TimeSpan timeout)
    {
        var sw = Stopwatch.StartNew();
        while (sw.Elapsed < timeout)
        {
            var msg = capture.LastTo(to);
            if (msg is not null) return msg;
            await Task.Delay(100);
        }
        throw new TimeoutException($"No email to {to} within {timeout}.");
    }
    [Fact]
    public async Task Unconfirmed_user_can_call_resend_verification()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"unconfirmed_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            firstName: "Test",
            lastName: "User",
            email: email,
            password: password,
            humanToken: "test-token",
            honeypot: ""
        ));

        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        var regEnvelope = await reg.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        regEnvelope.Should().NotBeNull();
        regEnvelope!.Data.Should().NotBeNull();
        regEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", regEnvelope.Data.AccessToken);

        var resend = await client.PostAsync("/api/auth/resend-verification", content: null);

        var body = await resend.Content.ReadAsStringAsync();
        if (resend.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Resend verification failed: {(int)resend.StatusCode} {resend.StatusCode}\n{body}");

        var envelope = await resend.Content.ReadFromJsonAsync<ApiEnvelope<string>>();
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();

        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var queued = await conn.ExecuteScalarAsync<long>(
            """
        SELECT COUNT(*)
        FROM EmailOutbox
        WHERE ToEmail = @to AND Kind = 'VerificationCode';
        """,
            new { to = email });

        queued.Should().BeGreaterThan(0);
    }

}