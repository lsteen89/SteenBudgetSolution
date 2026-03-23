using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Application.DTO.Auth;
using Backend.Application.DTO.Email;
using Backend.Application.DTO.User;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.IntegrationTests.Shared;
using Backend.IntegrationTests.TestHost;
using Backend.Presentation.Shared;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MySqlConnector;
using Backend.Application.DTO.User.Models;

namespace Backend.IntegrationTests.E2E.Settings;

[Collection("it:db")]
public sealed class UserSettingsE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public UserSettingsE2ETests(MariaDbFixture db)
    {
        _db = db;
        _factory = new ApiFactory(db);
    }

    [Fact]
    public async Task Update_preferences_should_persist_and_be_readable()
    {
        await _db.ResetAsync();

        var ctx = await CreateConfirmedAuthenticatedUserAsync();

        ctx.Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", ctx.AccessToken);

        var update = await ctx.Client.PutAsJsonAsync("/api/users/preferences", new
        {
            locale = "en-US",
            currency = "USD"
        });

        var updateBody = await update.Content.ReadAsStringAsync();
        if (update.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Update preferences failed: {(int)update.StatusCode} {update.StatusCode}\n{updateBody}");

        var updateEnvelope = await update.Content.ReadFromJsonAsync<ApiEnvelope<UserPreferencesDto>>();
        updateEnvelope.Should().NotBeNull();
        updateEnvelope!.IsSuccess.Should().BeTrue();
        updateEnvelope.Data.Should().NotBeNull();
        updateEnvelope.Data!.Locale.Should().Be("en-US");
        updateEnvelope.Data.Currency.Should().Be("USD");

        var get = await ctx.Client.GetAsync("/api/users/preferences");
        var getBody = await get.Content.ReadAsStringAsync();

        if (get.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Get preferences failed: {(int)get.StatusCode} {get.StatusCode}\n{getBody}");

        var getEnvelope = await get.Content.ReadFromJsonAsync<ApiEnvelope<UserPreferencesDto>>();
        getEnvelope.Should().NotBeNull();
        getEnvelope!.IsSuccess.Should().BeTrue();
        getEnvelope.Data.Should().NotBeNull();
        getEnvelope.Data!.Locale.Should().Be("en-US");
        getEnvelope.Data.Currency.Should().Be("USD");

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<(string Locale, string Currency)>(
            """
            SELECT Locale, Currency
            FROM UserSettings
            WHERE Persoid = UUID_TO_BIN(@persoid)
            LIMIT 1;
            """,
            new { persoid = ctx.PersoId.ToString() });

        row.Locale.Should().Be("en-US");
        row.Currency.Should().Be("USD");
    }

    [Fact]
    public async Task Update_profile_should_persist_and_be_visible_via_me()
    {
        await _db.ResetAsync();

        var ctx = await CreateConfirmedAuthenticatedUserAsync();

        ctx.Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", ctx.AccessToken);

        var update = await ctx.Client.PutAsJsonAsync("/api/users/profile", new
        {
            firstName = "Linus",
            lastName = "Steen"
        });

        var updateBody = await update.Content.ReadAsStringAsync();
        if (update.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Update profile failed: {(int)update.StatusCode} {update.StatusCode}\n{updateBody}");

        var updateEnvelope = await update.Content.ReadFromJsonAsync<ApiEnvelope<UserDto>>();
        updateEnvelope.Should().NotBeNull();
        updateEnvelope!.IsSuccess.Should().BeTrue();
        updateEnvelope.Data.Should().NotBeNull();
        updateEnvelope.Data!.FirstName.Should().Be("Linus");
        updateEnvelope.Data.LastName.Should().Be("Steen");

        var me = await ctx.Client.GetAsync("/api/users/me");
        var meBody = await me.Content.ReadAsStringAsync();

        if (me.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Get /me failed: {(int)me.StatusCode} {me.StatusCode}\n{meBody}");

        var meEnvelope = await me.Content.ReadFromJsonAsync<ApiEnvelope<UserDto>>();
        meEnvelope.Should().NotBeNull();
        meEnvelope!.IsSuccess.Should().BeTrue();
        meEnvelope.Data.Should().NotBeNull();
        meEnvelope.Data!.FirstName.Should().Be("Linus");
        meEnvelope.Data.LastName.Should().Be("Steen");

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync();

        var row = await conn.QuerySingleAsync<(string FirstName, string LastName)>(
            """
            SELECT FirstName, LastName
            FROM Users
            WHERE Persoid = UUID_TO_BIN(@persoid)
            LIMIT 1;
            """,
            new { persoid = ctx.PersoId.ToString() });

        row.FirstName.Should().Be("Linus");
        row.LastName.Should().Be("Steen");
    }

    [Fact]
    public async Task Update_password_should_invalidate_old_password_and_accept_new_one()
    {
        await _db.ResetAsync();

        var ctx = await CreateConfirmedAuthenticatedUserAsync();

        var newPassword = "NewPassword123!Aa";

        ctx.Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", ctx.AccessToken);

        var update = await ctx.Client.PutAsJsonAsync("/api/users/password", new
        {
            currentPassword = ctx.Password,
            newPassword = newPassword
        });

        var updateBody = await update.Content.ReadAsStringAsync();
        if (update.StatusCode != HttpStatusCode.OK)
            throw new Exception($"Update password failed: {(int)update.StatusCode} {update.StatusCode}\n{updateBody}");

        var updateEnvelope = await update.Content.ReadFromJsonAsync<ApiEnvelope<UpdatePasswordResultDto>>();
        updateEnvelope.Should().NotBeNull();
        updateEnvelope!.IsSuccess.Should().BeTrue();
        updateEnvelope.Data.Should().NotBeNull();
        updateEnvelope.Data!.Updated.Should().BeTrue();

        ctx.Client.DefaultRequestHeaders.Authorization = null;

        var oldLogin = await ctx.Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: ctx.Email,
            Password: ctx.Password,
            HumanToken: null,
            RememberMe: false
        ));

        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var newLogin = await ctx.Client.PostAsJsonAsync("/api/auth/login", new LoginRequest(
            Email: ctx.Email,
            Password: newPassword,
            HumanToken: null,
            RememberMe: false
        ));

        var newLoginBody = await newLogin.Content.ReadAsStringAsync();
        if (newLogin.StatusCode != HttpStatusCode.OK)
            throw new Exception($"New password login failed: {(int)newLogin.StatusCode} {newLogin.StatusCode}\n{newLoginBody}");

        var newLoginEnvelope = await newLogin.Content.ReadFromJsonAsync<ApiEnvelope<AuthResult>>();
        newLoginEnvelope.Should().NotBeNull();
        newLoginEnvelope!.IsSuccess.Should().BeTrue();
        newLoginEnvelope.Data.Should().NotBeNull();
        newLoginEnvelope.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Update_password_with_wrong_current_password_should_fail()
    {
        await _db.ResetAsync();

        var ctx = await CreateConfirmedAuthenticatedUserAsync();

        ctx.Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", ctx.AccessToken);

        var update = await ctx.Client.PutAsJsonAsync("/api/users/password", new
        {
            currentPassword = "DefinitelyWrongPassword123!",
            newPassword = "NewPassword123!Aa"
        });

        var updateBody = await update.Content.ReadAsStringAsync();
        if (update.StatusCode != HttpStatusCode.BadRequest)
            throw new Exception($"Expected bad request, got: {(int)update.StatusCode} {update.StatusCode}\n{updateBody}");

        var updateEnvelope = await update.Content.ReadFromJsonAsync<ApiEnvelope<UpdatePasswordResultDto>>();
        updateEnvelope.Should().NotBeNull();
        updateEnvelope!.IsSuccess.Should().BeFalse();
        updateEnvelope.Error.Should().NotBeNull();
        updateEnvelope.Error!.Code.Should().Be("Auth.InvalidCurrentPassword");
    }

    private async Task<AuthenticatedUserContext> CreateConfirmedAuthenticatedUserAsync()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"user_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        var verified = await AuthE2eHelper.RegisterUserAsync(
            client,
            _db.ConnectionString,
            email,
            password);

        return new AuthenticatedUserContext(
            client,
            email,
            password,
            verified.VerifiedAccessToken,
            verified.PersoId
        );
    }

    private sealed record AuthenticatedUserContext(
        HttpClient Client,
        string Email,
        string Password,
        string AccessToken,
        Guid PersoId
    );
}
