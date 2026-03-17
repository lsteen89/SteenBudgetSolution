using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Backend.Application.DTO.Email;
using Backend.Application.DTO.Auth;
using Backend.IntegrationTests.E2E.Helpers;
using Backend.IntegrationTests.TestHost;
using Backend.IntegrationTests.Shared;
using Backend.Presentation.Shared;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using MySqlConnector;
using Xunit;

namespace Backend.IntegrationTests.E2E.Support;

[Collection("it:db")]
public sealed class SupportMessageE2ETests
{
    private readonly MariaDbFixture _db;
    private readonly ApiFactory _factory;

    public SupportMessageE2ETests(MariaDbFixture db)
    {
        _db = db;
        _factory = new ApiFactory(db);
    }

    [Fact]
    public async Task Anonymous_cannot_send_support_message()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var response = await client.PostAsJsonAsync("/api/support/messages", new
        {
            subject = "Help needed",
            body = "Something is broken.",
            category = "technical"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Unconfirmed_user_cannot_send_support_message()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"support_unconfirmed_{Guid.NewGuid():N}@test.local";
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
            new AuthenticationHeaderValue("Bearer", regEnvelope.Data.AccessToken);

        var response = await client.PostAsJsonAsync("/api/support/messages", new
        {
            subject = "Help needed",
            body = "Something is broken.",
            category = "technical"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Confirmed_user_can_send_support_message_and_outbox_row_is_created()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"support_confirmed_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        await AuthE2eHelper.RegisterUserAsync(client, _db.ConnectionString, email, password);

        var response = await client.PostAsJsonAsync("/api/support/messages", new
        {
            subject = "Budget import issue",
            body = "I cannot save my budget after editing categories.",
            category = "technical"
        });

        var responseBody = await response.Content.ReadAsStringAsync();
        if (response.StatusCode != HttpStatusCode.Accepted)
            throw new Exception($"Support message failed: {(int)response.StatusCode} {response.StatusCode}\n{responseBody}");

        var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<object?>>();
        envelope.Should().NotBeNull();
        envelope!.IsSuccess.Should().BeTrue();
        envelope.Data.Should().BeNull();
        envelope.Info.Should().NotBeNull();
        envelope.Info!.Code.Should().Be("Support.MessageQueued");

        await using var assertConn = new MySqlConnection(_db.ConnectionString);
        await assertConn.OpenAsync();

        var outboxRow = await assertConn.QuerySingleAsync<SupportOutboxRow>(
            """
            SELECT Kind, ToEmail, Subject, BodyHtml, Attempts
            FROM EmailOutbox
            WHERE Kind = 'support_message'
            ORDER BY Id DESC
            LIMIT 1;
            """);

        outboxRow.Kind.Should().Be("support_message");
        outboxRow.Subject.Should().Be("[Support:technical] Budget import issue");
        outboxRow.Attempts.Should().Be(0);

        outboxRow.BodyHtml.Should().Contain(email);
        outboxRow.BodyHtml.Should().Contain("Budget import issue");
        outboxRow.BodyHtml.Should().Contain("I cannot save my budget after editing categories.");
    }

    [Fact]
    public async Task Confirmed_user_is_rate_limited_after_too_many_support_messages()
    {
        await _db.ResetAsync();

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var email = $"support_ratelimit_{Guid.NewGuid():N}@test.local";
        var password = "Password123!Aa";

        await AuthE2eHelper.RegisterUserAsync(client, _db.ConnectionString, email, password);

        async Task<HttpResponseMessage> SendAsync(int i) =>
            await client.PostAsJsonAsync("/api/support/messages", new
            {
                subject = $"Issue {i}",
                body = $"Body {i}",
                category = "technical"
            });

        var first = await SendAsync(1);
        var second = await SendAsync(2);
        var third = await SendAsync(3);
        var fourth = await SendAsync(4);

        first.StatusCode.Should().Be(HttpStatusCode.Accepted);
        second.StatusCode.Should().Be(HttpStatusCode.Accepted);
        third.StatusCode.Should().Be(HttpStatusCode.Accepted);
        fourth.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    private sealed class SupportOutboxRow
    {
        public string Kind { get; init; } = default!;
        public string ToEmail { get; init; } = default!;
        public string Subject { get; init; } = default!;
        public string BodyHtml { get; init; } = default!;
        public int Attempts { get; init; }
    }
}
