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
public sealed class AuthLoginE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public AuthLoginE2ETests(MariaDbFixture db)
    {
        _db = db;
        _factory = new ApiFactory(db);
    }

    [Fact]
    public async Task Login_confirmed_user_succeeds()
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
    public async Task Register_then_login_before_verification_should_issue_unconfirmed_session()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"e2e_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        var regReq = new RegisterRequest(
            firstName: "Test",
            lastName: "User",
            email: email,
            password: password,
            humanToken: "test-token",
            honeypot: ""
        );

        var reg = await client.PostAsJsonAsync("/api/auth/register", regReq);
        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        client.DefaultRequestHeaders.Authorization = null;

        var loginReq = new LoginRequest(
            Email: email,
            Password: password,
            HumanToken: null,
            RememberMe: false
        );

        var login = await client.PostAsJsonAsync("/api/auth/login", loginReq);
        var loginEnvelope = await login.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult>>();

        login.StatusCode.Should().Be(HttpStatusCode.OK);
        loginEnvelope.Should().NotBeNull();
        loginEnvelope!.IsSuccess.Should().BeTrue();
        loginEnvelope.Data.Should().NotBeNull();

        var token = loginEnvelope.Data!.AccessToken;
        token.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Claims.Should().Contain(x => x.Type == EbClaims.EmailConfirmed && x.Value == "false");
    }
    [Fact]
    public async Task Unconfirmed_user_cannot_access_confirmed_only_endpoint()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"unconfirmed_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        // Register only, do NOT verify
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            firstName: "Test",
            lastName: "User",
            email: email,
            password: password,
            humanToken: "test-token",
            honeypot: ""
        ));

        var regBody = await reg.Content.ReadAsStringAsync();
        if (reg.StatusCode != HttpStatusCode.Created)
            throw new Exception($"Register failed: {(int)reg.StatusCode} {reg.StatusCode}\n{regBody}");

        client.DefaultRequestHeaders.Authorization = null;

        // Login as unconfirmed user
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: password,
            HumanToken: null,
            RememberMe: false
        ));

        var loginBody = await login.Content.ReadAsStringAsync();
        if (login.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login failed: {(int)login.StatusCode} {login.StatusCode}\n{loginBody}");

        var loginEnvelope = await login.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult>>();
        loginEnvelope.Should().NotBeNull();
        loginEnvelope!.IsSuccess.Should().BeTrue();
        loginEnvelope.Data.Should().NotBeNull();
        loginEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        var token = loginEnvelope.Data.AccessToken;

        // Sanity-check claim is still false
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        jwt.Claims.Should().Contain(x => x.Type == EbClaims.EmailConfirmed && x.Value == "false");

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var protectedCall = await client.GetAsync("/api/budgets/dashboard");

        protectedCall.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

}