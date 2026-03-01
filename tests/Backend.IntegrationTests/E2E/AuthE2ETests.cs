using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.IntegrationTests.TestHost;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Backend.IntegrationTests.Shared;
using Dapper;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Backend.IntegrationTests.E2E;

[Collection("it:db")]
public sealed class AuthE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public AuthE2ETests(MariaDbFixture db)
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


        var capture = _factory.Services.GetRequiredService<IEmailCapture>();

        var email = $"e2e_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        // Register
        var req = new RegisterRequest(
          firstName: "Test",
          lastName: "Testsson",
          email: email,
          password: password,
          humanToken: "test-token",
          honeypot: ""
        );


        var reg = await client.PostAsJsonAsync("/api/auth/register", req);
        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var queued = await conn.ExecuteScalarAsync<long>(
            "SELECT COUNT(*) FROM EmailOutbox WHERE ToEmail=@to AND Kind='VerificationCode';",
            new { to = email });

        queued.Should().BeGreaterThan(0, "register should enqueue a verification email into EmailOutbox");
        if (!reg.IsSuccessStatusCode)
        {
            var body = await reg.Content.ReadAsStringAsync();
            throw new Exception($"Register failed: {(int)reg.StatusCode} {reg.StatusCode}\n{body}");
        }

        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        // Wait for email from outbox worker
        var bodyHtml = await conn.ExecuteScalarAsync<string>(
            "SELECT BodyHtml FROM EmailOutbox WHERE ToEmail=@to AND Kind='VerificationCode' ORDER BY Id DESC LIMIT 1;",
            new { to = email });

        bodyHtml.Should().NotBeNullOrWhiteSpace();
        var code = Extract6DigitCode(bodyHtml!);

        // Verify
        var verify = await client.PostAsJsonAsync("/api/auth/verify-email-code", new { email, code });
        verify.StatusCode.Should().Be(HttpStatusCode.OK);

        // Login
        var loginReq = new LoginRequest(
            Email: email,
            Password: password,
            HumanToken: null,
            RememberMe: false
        );


        var login = await client.PostAsJsonAsync("/api/auth/login", loginReq);
        if (login.StatusCode != HttpStatusCode.OK)
        {
            var body = await login.Content.ReadAsStringAsync();
            throw new Exception($"Login failed: {(int)login.StatusCode} {login.StatusCode}\n{body}");
        }
        login.StatusCode.Should().Be(HttpStatusCode.OK);
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

    private static string Extract6DigitCode(string html)
    {
        var m = Regex.Match(html, @"\b\d{6}\b");
        if (!m.Success) throw new Exception("No 6-digit verification code found in email body.");
        return m.Value;
    }
}