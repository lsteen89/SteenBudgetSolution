using System;
using System.Text;
using MediatR;
using FluentAssertions;
using Moq;
using Xunit;

using Backend.Application.Features.Commands.Auth.Logout;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.WebSockets;
using Backend.Infrastructure.WebSockets;

namespace Backend.Tests.UnitTests.Features.Authentication.Logout;

public sealed class LogoutHandlerTests
{
    private readonly Mock<IRefreshTokenRepository> _refresh = new();
    private readonly Mock<IJwtService> _jwt = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<IWebSocketManager> _ws = new();
    private readonly Mock<Microsoft.Extensions.Logging.ILogger<LogoutHandler>> _log = new();
    private readonly DateTime _now = new(2025, 1, 3, 12, 0, 0, DateTimeKind.Utc);

    private LogoutHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new LogoutHandler(_refresh.Object, _jwt.Object, _clock.Object, _ws.Object, _log.Object);
    }

    // -------------- Helpers --------------
    private static string MakeJwtWithPersoId(Guid persoid)
    {
        // craft a lightweight JWT the TokenHelper can parse (no signature; typical parse-only helpers accept this)
        var header = Base64Url("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        var payload = Base64Url($"{{\"sub\":\"{persoid}\",\"PersoId\":\"{persoid}\"}}");
        return $"{header}.{payload}.";
    }

    private static string Base64Url(string json)
    {
        var b = Encoding.UTF8.GetBytes(json);
        return Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }

    private static LogoutCommand Cmd(
        string at,
        string? cookie,
        Guid sessionId,
        bool all = false,
        string ua = "UA",
        string device = "dev-1")
        => new(at, cookie, sessionId, all, ua, device);

    // -------------- Tests --------------

    [Fact]
    public async Task Given_ValidAT_And_SingleSession_When_Handle_Then_BlacklistsAndRevokesSession_And_SendsWs()
    {
        var persoid = Guid.NewGuid();
        var session = Guid.NewGuid();
        var at = MakeJwtWithPersoId(persoid);

        var res = await SUT().Handle(Cmd(at, "cookie", session, all: false), CancellationToken.None);

        res.Should().Be(Unit.Value);

        _jwt.Verify(j => j.BlacklistJwtTokenAsync(at, It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RevokeSessionAsync(persoid, session, _now, It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RevokeAllForUserAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);

        _ws.Verify(w => w.SendMessageAsync(
            It.Is<UserSessionKey>(k => k.Persoid == persoid && k.SessionId == session),
            "LOGOUT"), Times.Once);
    }

    [Fact]
    public async Task Given_ValidAT_And_LogoutAll_When_Handle_Then_BlacklistsAndRevokesAll_And_SendsWs()
    {
        var persoid = Guid.NewGuid();
        var session = Guid.NewGuid();
        var at = MakeJwtWithPersoId(persoid);

        var res = await SUT().Handle(Cmd(at, null, session, all: true), CancellationToken.None);

        res.Should().Be(Unit.Value);

        _jwt.Verify(j => j.BlacklistJwtTokenAsync(at, It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RevokeAllForUserAsync(persoid, _now, It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RevokeSessionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);

        _ws.Verify(w => w.SendMessageAsync(
            It.Is<UserSessionKey>(k => k.Persoid == persoid && k.SessionId == session),
            "LOGOUT"), Times.Once);
    }

    [Fact]
    public async Task Given_BlacklistThrows_When_Handle_Then_StillRevokesAndSendsWs()
    {
        var persoid = Guid.NewGuid();
        var session = Guid.NewGuid();
        var at = MakeJwtWithPersoId(persoid);

        _jwt.Setup(j => j.BlacklistJwtTokenAsync(at, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("boom"));

        var res = await SUT().Handle(Cmd(at, null, session, all: true), CancellationToken.None);

        res.Should().Be(Unit.Value);
        _refresh.Verify(r => r.RevokeAllForUserAsync(persoid, _now, It.IsAny<CancellationToken>()), Times.Once);
        _ws.Verify(w => w.SendMessageAsync(
            It.Is<UserSessionKey>(k => k.Persoid == persoid && k.SessionId == session),
            "LOGOUT"), Times.Once);
    }

    [Fact]
    public async Task Given_InvalidAT_When_Handle_Then_ReturnsUnit_NoBlacklist_NoRevokes_NoWs()
    {
        var at = "not-a-jwt";
        var session = Guid.NewGuid();

        var res = await SUT().Handle(Cmd(at, null, session, all: false), CancellationToken.None);

        res.Should().Be(Unit.Value);

        _jwt.Verify(j => j.BlacklistJwtTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _refresh.VerifyNoOtherCalls();
        _ws.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_MissingSessionId_On_SingleSession_When_Handle_Then_Blacklists_But_NoRevokes_NoWs()
    {
        var persoid = Guid.NewGuid();
        var at = MakeJwtWithPersoId(persoid);

        var res = await SUT().Handle(Cmd(at, null, Guid.Empty, all: false), CancellationToken.None);

        res.Should().Be(Unit.Value);
        _jwt.Verify(j => j.BlacklistJwtTokenAsync(at, It.IsAny<CancellationToken>()), Times.Once);
        _refresh.Verify(r => r.RevokeSessionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
        _refresh.Verify(r => r.RevokeAllForUserAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Never);
        _ws.VerifyNoOtherCalls();
    }
}
