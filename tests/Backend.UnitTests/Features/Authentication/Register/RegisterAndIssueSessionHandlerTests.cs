using Backend.Application.DTO.Auth;
using FluentAssertions;
using Moq;
using Xunit;

using Backend.Application.Abstractions.Application.Services.Security;
using Backend.Application.Features.Authentication.Register.RegisterAndIssueSession;
using Backend.Application.Features.Authentication.Register.Shared.Models;
using Backend.Application.Features.Authentication.Shared.Models;
using Backend.Application.Features.Shared.Issuers.Auth;
using Backend.Domain.Entities.User;
using Backend.Domain.Errors.User;
using Backend.Domain.Shared;
using Backend.Application.Features.Authentication.Register.Orchestrator;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Entities.Email;

namespace Backend.Tests.UnitTests.Features.Authentication.Register;

public sealed class RegisterAndIssueSessionHandlerTests
{
    private readonly Mock<IRegistrationOrchestrator> _reg = new();
    private readonly Mock<IAuthSessionIssuer> _issuer = new();
    private readonly Mock<IUserRepository> _userRepo = new();

    private readonly Mock<ISeedingGate> _seedingGate = new();
    public bool IsSeedingOperation { get; init; }

    private RegisterAndIssueSessionHandler SUT()
        => new(_reg.Object, _userRepo.Object, _issuer.Object, _seedingGate.Object);

    private static RegisterAndIssueSessionCommand Cmd(bool isSeeding = false)
        => new(
            FirstName: "Linus",
            LastName: "Steen",
            Email: "user@example.com",
            Password: "P@ssw0rd!",
            HumanToken: "ok",
            Honeypot: "",
            Locale: "sv-SE",
            RemoteIp: null,
            DeviceId: "dev",
            UserAgent: "ua"
        )
        { IsSeedingOperation = isSeeding };

    [Fact]
    public async Task Given_RegistrationFails_When_Handle_Then_ReturnsFailure_And_DoesNotIssue()
    {
        _reg.Setup(x => x.RegisterAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string?>(),
                It.IsAny<bool>(),
                It.IsAny<CancellationToken>()))
           .ReturnsAsync(Result<RegistrationOutcome>.Failure(UserErrors.EmailAlreadyExists));

        _userRepo.Setup(x => x.GetEmailRegistrationStateAsync(
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmailRegistrationState(false, false));

        var r = await SUT().Handle(Cmd(), CancellationToken.None);

        r.IsFailure.Should().BeTrue();
        r.Error.Should().Be(UserErrors.EmailAlreadyExists);

        _issuer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_HoneypotOutcome_When_Handle_Then_ReturnsSuccessNull_And_DoesNotIssue()
    {
        _seedingGate.Setup(x => x.IsTrustedSeed(false)).Returns(false);
        _userRepo.Setup(x => x.GetEmailRegistrationStateAsync(
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmailRegistrationState(false, false));
        _reg.Setup(x => x.RegisterAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
                false,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<RegistrationOutcome>.Success(new RegistrationOutcome(true, null)));

        var r = await SUT().Handle(Cmd(isSeeding: false), CancellationToken.None);

        r.IsSuccess.Should().BeTrue();
        r.Value.Should().BeNull();

        _reg.Verify(x => x.RegisterAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
            false,
            It.IsAny<CancellationToken>()), Times.Once);

        _issuer.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserCreated_When_Handle_Then_IssuesSession_And_ReturnsIssuedAuthSession()
    {
        _seedingGate.Setup(x => x.IsTrustedSeed(false)).Returns(false);
        _userRepo.Setup(x => x.GetEmailRegistrationStateAsync(
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmailRegistrationState(false, false));
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Email = "user@example.com",
            Password = "dummy-hash",
            FirstName = "X",
            LastName = "Y",
            Roles = "1",
            EmailConfirmed = false
        };

        _reg.Setup(x => x.RegisterAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(),
                false,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<RegistrationOutcome>.Success(new RegistrationOutcome(false, user)));

        var expected = new IssuedAuthSession(
            new AuthResult("at", user.PersoId, Guid.NewGuid(), "ws", false),
            "rt"
        );

        _issuer.Setup(x => x.IssueAsync(user, false, "dev", "ua", It.IsAny<CancellationToken>()))
               .ReturnsAsync(expected);

        var r = await SUT().Handle(Cmd(isSeeding: false), CancellationToken.None);

        r.IsSuccess.Should().BeTrue();
        r.Value.Should().BeEquivalentTo(expected);

        _issuer.Verify(x => x.IssueAsync(user, false, "dev", "ua", It.IsAny<CancellationToken>()), Times.Once);
    }
    [Fact]
    public async Task Given_RequestedSeeding_ButNotTrusted_When_Handle_Then_Fails_SeedingNotAllowed_And_DoesNotRegister()
    {
        _seedingGate.Setup(x => x.IsTrustedSeed(true)).Returns(false);

        var r = await SUT().Handle(Cmd(isSeeding: true), CancellationToken.None);

        r.IsFailure.Should().BeTrue();
        r.Error.Should().Be(UserErrors.SeedingNotAllowed);

        _reg.VerifyNoOtherCalls();
        _issuer.VerifyNoOtherCalls();
    }
}