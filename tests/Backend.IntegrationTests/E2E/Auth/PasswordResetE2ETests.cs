using System.Net;
using System.Net.Http.Json;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.Application.DTO.Auth;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.TestHost;
using Backend.Presentation.Shared;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Backend.Application.DTO.Email;
using System.Security.Cryptography;
using System.Text;



namespace Backend.IntegrationTests.E2E.Auth;

[Collection("it:db")]
public sealed class PasswordResetE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public PasswordResetE2ETests(MariaDbFixture db)
    {
        _db = db;
        _factory = new ApiFactory(db);
    }

    [Fact]
    public async Task Forgot_password_and_reset_password_happy_path()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"reset_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";
        var newPassword = "NewPassword123!Aa";

        // Arrange: create verified user through normal registration flow
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            firstName: "Test",
            lastName: "Resetsson",
            email: email,
            password: oldPassword,
            humanToken: "test-token",
            honeypot: ""
        ));

        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        var regEnvelope = await reg.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        regEnvelope.Should().NotBeNull();
        regEnvelope!.IsSuccess.Should().BeTrue();
        regEnvelope.Data.Should().NotBeNull();
        regEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", regEnvelope.Data.AccessToken);

        await using (var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var verificationHtml = await conn.ExecuteScalarAsync<string>(
                """
                SELECT BodyHtml
                FROM EmailOutbox
                WHERE ToEmail=@to AND Kind='VerificationCode'
                ORDER BY Id DESC
                LIMIT 1;
                """,
                new { to = email });

            verificationHtml.Should().NotBeNullOrWhiteSpace();
            var verificationCode = E2eTestHelpers.Extract6DigitCode(verificationHtml!);

            var verify = await client.PostAsJsonAsync(
                "/api/auth/verify-email-code",
                new VerifyEmailCodeRequest(verificationCode));

            verify.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        client.DefaultRequestHeaders.Authorization = null;

        // Act 1: request password reset
        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var forgotBody = await forgot.Content.ReadAsStringAsync();
        if (forgot.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Forgot-password failed: {(int)forgot.StatusCode} {forgot.StatusCode}\n{forgotBody}");

        var forgotEnvelope = await forgot.Content.ReadFromJsonAsync<ApiEnvelope<string>>();
        forgotEnvelope.Should().NotBeNull();
        forgotEnvelope!.IsSuccess.Should().BeTrue();

        string resetCode;
        await using (var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var queued = await conn.ExecuteScalarAsync<long>(
                """
                SELECT COUNT(*)
                FROM EmailOutbox
                WHERE ToEmail=@to AND Kind='password-reset';
                """,
                new { to = email });

            queued.Should().BeGreaterThan(0);

            var bodyHtml = await conn.ExecuteScalarAsync<string>(
                """
                SELECT BodyHtml
                FROM EmailOutbox
                WHERE ToEmail=@to AND Kind='password-reset'
                ORDER BY Id DESC
                LIMIT 1;
                """,
                new { to = email });

            bodyHtml.Should().NotBeNullOrWhiteSpace();
            resetCode = E2eTestHelpers.Extract6DigitCode(bodyHtml!);
        }

        // Act 2: reset password
        var reset = await client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest(email, resetCode, newPassword, ConfirmPassword: newPassword));

        var resetBody = await reset.Content.ReadAsStringAsync();
        if (reset.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Reset-password failed: {(int)reset.StatusCode} {reset.StatusCode}\n{resetBody}");

        var resetEnvelope = await reset.Content.ReadFromJsonAsync<ApiEnvelope<string>>();
        resetEnvelope.Should().NotBeNull();
        resetEnvelope!.IsSuccess.Should().BeTrue();

        // Assert: old password fails
        var oldLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: oldPassword,
            HumanToken: null,
            RememberMe: false
        ));

        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Assert: new password works
        var newLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: newPassword,
            HumanToken: null,
            RememberMe: false
        ));

        var newLoginBody = await newLogin.Content.ReadAsStringAsync();
        if (newLogin.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login with new password failed: {(int)newLogin.StatusCode} {newLogin.StatusCode}\n{newLoginBody}");
    }

    [Fact]
    public async Task Forgot_password_unknown_email_returns_ok_and_does_not_enqueue_email()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"unknown_{Guid.NewGuid():N}@test.local";

        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var body = await forgot.Content.ReadAsStringAsync();
        if (forgot.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Forgot-password failed: {(int)forgot.StatusCode} {forgot.StatusCode}\n{body}");

        var envelope = await forgot.Content.ReadFromJsonAsync<ApiEnvelope<string>>();
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();

        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var queued = await conn.ExecuteScalarAsync<long>(
            """
            SELECT COUNT(*)
            FROM EmailOutbox
            WHERE ToEmail=@to AND Kind='password-reset';
            """,
            new { to = email });

        queued.Should().Be(0);
    }

    [Fact]
    public async Task Reset_password_with_wrong_code_returns_bad_request()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"wrongcode_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";

        // Create verified user
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            firstName: "Test",
            lastName: "Wrongcode",
            email: email,
            password: oldPassword,
            humanToken: "test-token",
            honeypot: ""
        ));

        reg.StatusCode.Should().Be(HttpStatusCode.Created);

        var regEnvelope = await reg.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        regEnvelope.Should().NotBeNull();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", regEnvelope!.Data!.AccessToken);

        await using (var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var verificationHtml = await conn.ExecuteScalarAsync<string>(
                """
                SELECT BodyHtml
                FROM EmailOutbox
                WHERE ToEmail=@to AND Kind='VerificationCode'
                ORDER BY Id DESC
                LIMIT 1;
                """,
                new { to = email });

            var verificationCode = E2eTestHelpers.Extract6DigitCode(verificationHtml!);

            var verify = await client.PostAsJsonAsync(
                "/api/auth/verify-email-code",
                new VerifyEmailCodeRequest(verificationCode));

            verify.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        client.DefaultRequestHeaders.Authorization = null;

        // Request real reset so active reset row exists
        var forgot = await client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        forgot.StatusCode.Should().Be(HttpStatusCode.OK);

        // Use wrong code
        var reset = await client.PostAsJsonAsync("/api/auth/reset-password",
            new ResetPasswordRequest(email, "000000", "NewPassword123!Aa", "NewPassword123!Aa"));

        reset.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Old password should still work
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: oldPassword,
            HumanToken: null,
            RememberMe: false
        ));

        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }
    [Fact]
    public async Task Reset_password_code_cannot_be_reused()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"reuse_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";
        var firstNewPassword = "NewPassword123!Aa";
        var secondNewPassword = "AnotherPassword123!Aa";

        await RegisterAndVerifyUserAsync(client, email, oldPassword);

        var forgot = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var forgotBody = await forgot.Content.ReadAsStringAsync();
        if (forgot.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Forgot-password failed: {(int)forgot.StatusCode} {forgot.StatusCode}\n{forgotBody}");

        var code = await GetLatestPasswordResetCodeAsync(email);

        // First use should succeed
        var firstReset = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, code, firstNewPassword, ConfirmPassword: firstNewPassword));

        var firstResetBody = await firstReset.Content.ReadAsStringAsync();
        if (firstReset.StatusCode != HttpStatusCode.OK)
            throw new Exception($"First reset failed: {(int)firstReset.StatusCode} {firstReset.StatusCode}\n{firstResetBody}");

        // Second use of same code must fail
        var secondReset = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, code, secondNewPassword, ConfirmPassword: secondNewPassword));

        secondReset.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // First new password should work
        var loginWithFirstNewPassword = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: firstNewPassword,
            HumanToken: null,
            RememberMe: false
        ));

        var login1Body = await loginWithFirstNewPassword.Content.ReadAsStringAsync();
        if (loginWithFirstNewPassword.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login with first new password failed: {(int)loginWithFirstNewPassword.StatusCode} {loginWithFirstNewPassword.StatusCode}\n{login1Body}");

        // Second new password must NOT work
        var loginWithSecondNewPassword = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: secondNewPassword,
            HumanToken: null,
            RememberMe: false
        ));

        loginWithSecondNewPassword.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // Optional DB assertion
        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var usedAt = await conn.ExecuteScalarAsync<DateTime?>(
            """
        SELECT UsedAtUtc
        FROM PasswordResetRequests
        WHERE Email = @email
        ORDER BY CreatedAtUtc DESC
        LIMIT 1;
        """,
            new { email });

        usedAt.Should().NotBeNull();
    }
    [Fact]
    public async Task Second_forgot_password_invalidates_previous_code()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"reset_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";
        var newPassword = "NewPassword123!Aa";

        // Arrange: create and verify a user
        await RegisterAndVerifyUserAsync(client, email, oldPassword);

        // First forgot-password request
        var forgot1 = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var forgot1Body = await forgot1.Content.ReadAsStringAsync();
        if (forgot1.StatusCode != HttpStatusCode.OK)
            throw new Exception($"First forgot-password failed: {(int)forgot1.StatusCode} {forgot1.StatusCode}\n{forgot1Body}");

        var code1 = await GetLatestPasswordResetCodeAsync(email);

        // Second forgot-password request
        var forgot2 = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var forgot2Body = await forgot2.Content.ReadAsStringAsync();
        if (forgot2.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Second forgot-password failed: {(int)forgot2.StatusCode} {forgot2.StatusCode}\n{forgot2Body}");

        var code2 = await GetLatestPasswordResetCodeAsync(email);

        code2.Should().NotBe(code1);

        // First code must now fail
        var resetWithOldCode = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, code1, newPassword, ConfirmPassword: newPassword));

        resetWithOldCode.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Second code must succeed
        var resetWithNewCode = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, code2, newPassword, ConfirmPassword: newPassword));

        var resetWithNewCodeBody = await resetWithNewCode.Content.ReadAsStringAsync();
        if (resetWithNewCode.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Reset with second code failed: {(int)resetWithNewCode.StatusCode} {resetWithNewCode.StatusCode}\n{resetWithNewCodeBody}");

        // Old password should fail
        var oldLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: oldPassword,
            HumanToken: null,
            RememberMe: false
        ));

        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // New password should work
        var newLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: newPassword,
            HumanToken: null,
            RememberMe: false
        ));

        var newLoginBody = await newLogin.Content.ReadAsStringAsync();
        if (newLogin.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login with new password failed: {(int)newLogin.StatusCode} {newLogin.StatusCode}\n{newLoginBody}");

        // Optional DB assertion: first request invalidated
        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var invalidatedCount = await conn.ExecuteScalarAsync<long>(
            """
            SELECT COUNT(*)
            FROM PasswordResetRequests
            WHERE Email = @email
              AND InvalidatedAtUtc IS NOT NULL;
            """,
            new { email });

        invalidatedCount.Should().BeGreaterThanOrEqualTo(1);
    }
    [Fact]
    public async Task Successful_reset_revokes_refresh_tokens()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = true
        });

        var email = $"revoke_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";
        var newPassword = "NewPassword123!Aa";

        await RegisterAndVerifyUserAsync(client, email, oldPassword);

        // Login once to obtain refresh cookie/session
        // Login once to obtain refresh cookie/session
        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: oldPassword,
            HumanToken: null,
            RememberMe: true
        ));

        var loginBody = await login.Content.ReadAsStringAsync();
        if (login.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Initial login failed: {(int)login.StatusCode} {login.StatusCode}\n{loginBody}");

        var loginEnvelope = await login.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult?>>();
        loginEnvelope.Should().NotBeNull();
        loginEnvelope!.IsSuccess.Should().BeTrue();
        loginEnvelope.Data.Should().NotBeNull();
        loginEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();

        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", loginEnvelope.Data.AccessToken);

        // Debug cookie issuance once
        var setCookie = login.Headers.TryGetValues("Set-Cookie", out var values)
            ? string.Join("\n", values)
            : "<none>";
        Console.WriteLine($"Set-Cookie from login:\n{setCookie}");

        // Sanity check: refresh should work before password reset
        var refreshBefore = await client.PostAsync("/api/auth/refresh", content: null);
        var refreshBeforeBody = await refreshBefore.Content.ReadAsStringAsync();
        if (refreshBefore.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Refresh before reset failed: {(int)refreshBefore.StatusCode} {refreshBefore.StatusCode}\n{refreshBeforeBody}");
        // Request password reset
        var forgot = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordRequest(email, "en-US"));

        var forgotBody = await forgot.Content.ReadAsStringAsync();
        if (forgot.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Forgot-password failed: {(int)forgot.StatusCode} {forgot.StatusCode}\n{forgotBody}");

        var code = await GetLatestPasswordResetCodeAsync(email);

        // Perform password reset
        var reset = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, code, newPassword, ConfirmPassword: newPassword));

        var resetBody = await reset.Content.ReadAsStringAsync();
        if (reset.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Reset-password failed: {(int)reset.StatusCode} {reset.StatusCode}\n{resetBody}");

        // Old refresh cookie/session must now be dead
        var refreshAfter = await client.PostAsync("/api/auth/refresh", content: null);
        refreshAfter.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        // New password should still allow a fresh login
        var loginWithNewPassword = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: newPassword,
            HumanToken: null,
            RememberMe: true
        ));

        var loginWithNewPasswordBody = await loginWithNewPassword.Content.ReadAsStringAsync();
        if (loginWithNewPassword.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login with new password failed: {(int)loginWithNewPassword.StatusCode} {loginWithNewPassword.StatusCode}\n{loginWithNewPasswordBody}");
    }
    [Fact]
    public async Task Reset_password_with_expired_code_returns_bad_request()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"expired_{Guid.NewGuid():N}@test.local";
        var oldPassword = "Password123!Aa";
        var newPassword = "NewPassword123!Aa";
        var expiredCode = "123456";

        await RegisterAndVerifyUserAsync(client, email, oldPassword);

        await using (var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString))
        {
            await conn.OpenAsync();

            var user = await conn.QuerySingleAsync<(Guid PersoId, string Email)>(
                """
            SELECT PersoId, Email
            FROM Users
            WHERE Email = @email
            LIMIT 1;
            """,
                new { email });

            var codeHash = HashCode(expiredCode);
            // IMPORTANT:
            // Replace this with your real hashing logic if your reset flow uses _codes.HashCode(...)
            // If you use SHA256/base64 in production, do the same here.

            await conn.ExecuteAsync(
                        """
            INSERT INTO PasswordResetRequests
            (
                Id,
                Persoid,
                Email,
                CodeHash,
                ExpiresAtUtc,
                UsedAtUtc,
                CreatedAtUtc,
                InvalidatedAtUtc
            )
            VALUES
            (
                @Id,
                @Persoid,
                @Email,
                @CodeHash,
                @ExpiresAtUtc,
                NULL,
                @CreatedAtUtc,
                NULL
            );
            """,
                        new
                        {
                            Id = Guid.NewGuid(),
                            Persoid = user.PersoId,
                            Email = email,
                            CodeHash = codeHash,
                            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-5),
                            CreatedAtUtc = DateTime.UtcNow.AddMinutes(-20)
                        });
        }

        var reset = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new ResetPasswordRequest(email, expiredCode, newPassword, ConfirmPassword: newPassword));

        reset.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Old password should still work
        var oldLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: oldPassword,
            HumanToken: null,
            RememberMe: false
        ));

        var oldLoginBody = await oldLogin.Content.ReadAsStringAsync();
        if (oldLogin.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Login with old password failed: {(int)oldLogin.StatusCode} {oldLogin.StatusCode}\n{oldLoginBody}");

        // New password must NOT work
        var newLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: email,
            Password: newPassword,
            HumanToken: null,
            RememberMe: false
        ));

        newLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task RegisterAndVerifyUserAsync(HttpClient client, string email, string password)
    {
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            firstName: "Test",
            lastName: "Resetsson",
            email: email,
            password: password,
            humanToken: "test-token",
            honeypot: ""
        ));

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

        var verificationCode = await GetLatestVerificationCodeAsync(email);

        var verify = await client.PostAsJsonAsync(
            "/api/auth/verify-email-code",
            new VerifyEmailCodeRequest(verificationCode));

        var verifyBody = await verify.Content.ReadAsStringAsync();
        if (verify.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Verify failed: {(int)verify.StatusCode} {verify.StatusCode}\n{verifyBody}");

        client.DefaultRequestHeaders.Authorization = null;
    }


    private async Task<string> GetLatestVerificationCodeAsync(string email)
    {
        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var bodyHtml = await conn.ExecuteScalarAsync<string>(
            """
            SELECT BodyHtml
            FROM EmailOutbox
            WHERE ToEmail=@to AND Kind='VerificationCode'
            ORDER BY Id DESC
            LIMIT 1;
            """,
            new { to = email });

        bodyHtml.Should().NotBeNullOrWhiteSpace();
        return E2eTestHelpers.Extract6DigitCode(bodyHtml!);
    }

    private async Task<string> GetLatestPasswordResetCodeAsync(string email)
    {
        await using var conn = new MySqlConnector.MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var bodyHtml = await conn.ExecuteScalarAsync<string>(
            """
            SELECT BodyHtml
            FROM EmailOutbox
            WHERE ToEmail=@to AND Kind='password-reset'
            ORDER BY Id DESC
            LIMIT 1;
            """,
            new { to = email });

        bodyHtml.Should().NotBeNullOrWhiteSpace();
        return E2eTestHelpers.Extract6DigitCode(bodyHtml!);
    }
    public string HashCode(string code)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}