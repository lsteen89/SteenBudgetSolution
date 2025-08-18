using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;

using Backend.Application.Features.Commands.Auth.VerifyEmail;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Domain.Entities.Auth;
using Backend.Domain.Users;

// Domain model
using UserModel = Backend.Domain.Entities.User.UserModel;

namespace Backend.Tests.UnitTests.Features.Authentication.Verify;

public sealed class VerifyEmailCommandHandlerTests
{
    private readonly Mock<IVerificationTokenRepository> _tokens = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<Microsoft.Extensions.Logging.ILogger<VerifyEmailCommandHandler>> _log = new();

    private readonly DateTime _now = new(2025, 1, 6, 12, 0, 0, DateTimeKind.Utc);

    private VerifyEmailCommandHandler SUT()
    {
        _clock.Setup(x => x.UtcNow).Returns(_now);
        return new VerifyEmailCommandHandler(_tokens.Object, _users.Object, _clock.Object, _log.Object);
    }

    private static VerifyEmailCommand Cmd(Guid? token = null) => new(token ?? Guid.NewGuid());

    private static UserModel User(Guid id, bool confirmed) =>
        new() { Id = 1, PersoId = id, Email = "user@example.com", Password = "hash", EmailConfirmed = confirmed };

    private static UserTokenModel Tok(Guid persoid, Guid token, DateTime exp) =>
        new() { PersoId = persoid, Token = token, TokenExpiryDate = exp };

    [Fact]
    public async Task Given_TokenMissing_When_Handle_Then_VerificationTokenNotFound()
    {
        var cmd = Cmd();
        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>())).ReturnsAsync((UserTokenModel?)null);

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationTokenNotFound);
    }

    [Fact]
    public async Task Given_TokenExpired_When_Handle_Then_VerificationTokenNotFound()
    {
        var persoid = Guid.NewGuid();
        var cmd = Cmd();
        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(persoid, cmd.Token, _now.AddSeconds(-1)));

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationTokenNotFound);
    }

    [Fact]
    public async Task Given_UserMissing_ForValidToken_When_Handle_Then_VerificationTokenNotFound_NoInfoLeak()
    {
        var persoid = Guid.NewGuid();
        var cmd = Cmd();
        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(persoid, cmd.Token, _now.AddHours(1)));

        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync((UserModel?)null);

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationTokenNotFound);
    }

    [Fact]
    public async Task Given_AlreadyVerified_When_Handle_Then_EmailAlreadyVerified_And_DoesNotDeleteTokens()
    {
        var persoid = Guid.NewGuid();
        var cmd = Cmd();
        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(persoid, cmd.Token, _now.AddHours(1)));

        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(persoid, confirmed: true));

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.EmailAlreadyVerified);
        _tokens.Verify(t => t.DeleteAllForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ConfirmFails_When_Handle_Then_VerificationUpdateFailed_And_NoTokenDeletion()
    {
        var persoid = Guid.NewGuid();
        var cmd = Cmd();

        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(persoid, cmd.Token, _now.AddHours(1)));
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(persoid, confirmed: false));
        _users.Setup(u => u.ConfirmUserEmailAsync(persoid, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationUpdateFailed);
        _tokens.Verify(t => t.DeleteAllForUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ValidToken_And_UserNotVerified_When_Handle_Then_ConfirmsAndDeletesAllTokens_Success()
    {
        var persoid = Guid.NewGuid();
        var cmd = Cmd();

        _tokens.Setup(t => t.GetByTokenAsync(cmd.Token, It.IsAny<CancellationToken>()))
               .ReturnsAsync(Tok(persoid, cmd.Token, _now.AddHours(1)));
        _users.Setup(u => u.GetUserModelAsync(persoid, null, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(persoid, confirmed: false));
        _users.Setup(u => u.ConfirmUserEmailAsync(persoid, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var res = await SUT().Handle(cmd, CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        _users.Verify(u => u.ConfirmUserEmailAsync(persoid, It.IsAny<CancellationToken>()), Times.Once);
        _tokens.Verify(t => t.DeleteAllForUserAsync(persoid, It.IsAny<CancellationToken>()), Times.Once);
    }
}
