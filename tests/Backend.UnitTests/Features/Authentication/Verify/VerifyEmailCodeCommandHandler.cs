using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using Backend.Application.DTO.Auth;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Features.VerifyEmail;
using Backend.Application.Options.Verification;
using Backend.Domain.Entities.User;
using Backend.Domain.Errors.User;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Application.Common.Security;
using Backend.Application.Features.Authentication.Shared.Models;


namespace Backend.UnitTests.Features.Authentication.Verify;

public sealed class VerifyEmailCodeCommandHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IEmailVerificationCodeRepository> _codes = new();
    private readonly Mock<ITimeProvider> _clock = new();
    private readonly Mock<IAuthSessionIssuer> _issuer = new();
    private static VerificationCodeOptions Opt(DateTime now) => new()
    {
        TtlMinutes = 15,
        MaxAttempts = 5,
        LockMinutes = 15,
        CodeHmacKeyBase64 = Convert.ToBase64String(new byte[32]
        {
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,
            17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32
        })
    };

    private VerifyEmailCodeCommandHandler SUT(DateTime now)
        => new(_users.Object, _codes.Object, _clock.Object, Options.Create(Opt(now)), _issuer.Object);

    private static UserModel User(Guid persoId, string email, bool confirmed)
        => new()
        {
            PersoId = persoId,
            Email = email,
            EmailConfirmed = confirmed,
            Password = "x", // required member
            Roles = "1"
        };

    private static EmailVerificationCodeState State(
        byte[] hash,
        DateTime expiresAtUtc,
        int attempts,
        DateTime? lockedUntilUtc,
        int sentCount = 1,
        DateTime? lastSentAtUtc = null)
        => new EmailVerificationCodeState(
            CodeHash: hash,
            ExpiresAtUtc: expiresAtUtc,
            AttemptCount: attempts,
            LockedUntilUtc: lockedUntilUtc,
            SentCount: sentCount,
            LastSentAtUtc: lastSentAtUtc
        );



    [Fact]
    public async Task Given_WrongCode_When_BelowMaxAttempts_Then_IncrementsAttempts_NoLock()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));

        var secret = Convert.FromBase64String(Opt(now).CodeHmacKeyBase64);
        var goodHash = VerificationCode.Hash(id, "123456", secret);

        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(State(goodHash, now.AddMinutes(15), attempts: 0, lockedUntilUtc: null));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidVerificationCode);

        _codes.Verify(r => r.IncrementFailureAsync(id, 1, null, It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.ConfirmUserEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_WrongCode_When_ReachesMaxAttempts_Then_Locks()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));

        var opt = Opt(now);
        var secret = Convert.FromBase64String(opt.CodeHmacKeyBase64);
        var goodHash = VerificationCode.Hash(id, "123456", secret);

        // attemptCount = MaxAttempts-1 => next wrong locks
        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(State(goodHash, now.AddMinutes(opt.TtlMinutes), attempts: opt.MaxAttempts - 1, lockedUntilUtc: null));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidVerificationCode);

        var expectedLock = now.AddMinutes(opt.LockMinutes);
        _codes.Verify(r => r.IncrementFailureAsync(id, opt.MaxAttempts, expectedLock, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_Locked_When_Verify_Then_ReturnsLocked_NoIncrement()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));

        var secret = Convert.FromBase64String(Opt(now).CodeHmacKeyBase64);
        var hash = VerificationCode.Hash(id, "123456", secret);

        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(State(hash, now.AddMinutes(15), attempts: 2, lockedUntilUtc: now.AddMinutes(3)));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationLocked);

        _codes.Verify(r => r.IncrementFailureAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()), Times.Never);
        _codes.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.ConfirmUserEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_Expired_When_Verify_Then_ReturnsExpired_NoIncrement()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));

        var secret = Convert.FromBase64String(Opt(now).CodeHmacKeyBase64);
        var hash = VerificationCode.Hash(id, "123456", secret);

        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(State(hash, now.AddSeconds(-1), attempts: 0, lockedUntilUtc: null));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.VerificationExpired);

        _codes.Verify(r => r.IncrementFailureAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()), Times.Never);
        _codes.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.ConfirmUserEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_CorrectCode_When_Verify_Then_DeletesCode_And_ConfirmsEmail()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));
        _issuer.Setup(i => i.IssueAsync(
                It.IsAny<UserModel>(),
                true,
                "device-1",
                "ua",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new IssuedAuthSession(
                new AuthResult("at", id, Guid.NewGuid(), "mac", true),
                "rt"));
        var secret = Convert.FromBase64String(Opt(now).CodeHmacKeyBase64);
        var hash = VerificationCode.Hash(id, "123456", secret);

        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(State(hash, now.AddMinutes(15), attempts: 0, lockedUntilUtc: null));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "123456", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        _codes.Verify(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()), Times.Once);
        _users.Verify(r => r.ConfirmUserEmailAsync(id, It.IsAny<CancellationToken>()), Times.Once);
        _codes.Verify(r => r.IncrementFailureAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_AlreadyConfirmed_When_Verify_Then_Success_And_NoSideEffects()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";
        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: true));

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeTrue();

        _codes.VerifyNoOtherCalls();
        _users.Verify(r => r.ConfirmUserEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_NoUser_When_Verify_Then_GenericInvalid()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);
        var email = "user@example.com";

        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync((UserModel?)null);

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidVerificationCode);

        _codes.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_NoCodeState_When_Verify_Then_GenericInvalid()
    {
        var now = new DateTime(2026, 2, 20, 10, 0, 0, DateTimeKind.Utc);
        _clock.SetupGet(x => x.UtcNow).Returns(now);

        var id = Guid.NewGuid();
        var email = "user@example.com";

        _users.Setup(r => r.GetUserModelAsync(null, email, It.IsAny<CancellationToken>()))
              .ReturnsAsync(User(id, email, confirmed: false));

        _codes.Setup(r => r.GetByUserAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync((EmailVerificationCodeState?)null);

        var res = await SUT(now).Handle(
            new VerifyEmailCodeCommand(email, "000000", "device-1", "ua", RememberMe: true),
            CancellationToken.None);

        res.IsSuccess.Should().BeFalse();
        res.Error.Should().Be(UserErrors.InvalidVerificationCode);

        _codes.Verify(r => r.IncrementFailureAsync(It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<DateTime?>(), It.IsAny<CancellationToken>()), Times.Never);
        _codes.Verify(r => r.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(r => r.ConfirmUserEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
