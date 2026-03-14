using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Application.Abstractions.Infrastructure.Verification;
using Backend.Application.Features.Authentication.Register.Orchestrator;
using Backend.Application.Features.Authentication.Register.Shared.Models;
using Backend.Domain.Entities.User;
using Backend.Domain.Errors.User;
using Backend.Application.Abstractions.Application.Services.Security;

namespace Backend.Tests.UnitTests.Features.Authentication.Register;

public sealed class RegistrationOrchestratorTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<ITurnstileService> _turnstile = new();
    private readonly Mock<IVerificationCodeOrchestrator> _verification = new();
    private readonly Mock<ILogger<RegistrationOrchestrator>> _log = new();
    private readonly Mock<IPasswordService> _passwordService = new();

    private RegistrationOrchestrator SUT()
        => new(_users.Object, _turnstile.Object, _passwordService.Object, _verification.Object, _log.Object);

    [Fact]
    public async Task Given_HoneypotFilled_When_RegisterAsync_Then_Success_IsHoneypot_True_And_NoSideEffects()
    {
        var r = await SUT().RegisterAsync(
            firstName: "Linus",
            lastName: "Steen",
            email: "user@example.com",
            password: "P@ssw0rd!",
            humanToken: "ok",
            honeypot: "bot",
            locale: "sv-SE",
            remoteIp: null,
            trustedSeed: false,
            ct: CancellationToken.None);



        r.IsSuccess.Should().BeTrue();
        r.Value.Should().NotBeNull();
        r.Value!.IsHoneypot.Should().BeTrue();
        r.Value.User.Should().BeNull();

        _turnstile.Verify(x => x.ValidateAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.VerifyNoOtherCalls();
        _verification.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_InvalidTurnstile_When_RegisterAsync_Then_Failure_InvalidChallengeToken_And_NoSideEffects()
    {
        _turnstile
            .Setup(x => x.ValidateAsync("bad", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var r = await SUT().RegisterAsync(
            "Linus", "Steen", "user@example.com", "P@ssw0rd!",
            humanToken: "bad",
            honeypot: "",
            locale: "sv-SE",
            remoteIp: null,
            trustedSeed: false,
            ct: CancellationToken.None);

        r.IsFailure.Should().BeTrue();
        r.Error.Should().Be(UserErrors.InvalidChallengeToken);

        _users.VerifyNoOtherCalls();
        _verification.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_EmailAlreadyExists_When_RegisterAsync_Then_Failure_EmailAlreadyExists_And_NoCreate_NoEnqueue()
    {
        _turnstile.Setup(x => x.ValidateAsync("ok", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        var r = await SUT().RegisterAsync(
            "Linus", "Steen", "user@example.com", "P@ssw0rd!",
            "ok", "", "sv-SE", null, trustedSeed: false, CancellationToken.None);

        r.IsFailure.Should().BeTrue();
        r.Error.Should().Be(UserErrors.EmailAlreadyExists);

        _users.Verify(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()), Times.Never);
        _verification.Verify(x => x.EnqueueForNewUserAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_CreateUserFails_When_RegisterAsync_Then_Failure_RegistrationFailed_And_NoEnqueue()
    {
        _turnstile.Setup(x => x.ValidateAsync("ok", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);

        _users.Setup(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);

        var r = await SUT().RegisterAsync(
            "Linus", "Steen", "user@example.com", "P@ssw0rd!",
            "ok", "", "sv-SE", null, trustedSeed: false, CancellationToken.None);

        r.IsFailure.Should().BeTrue();
        r.Error.Should().Be(UserErrors.RegistrationFailed);

        _verification.Verify(x => x.EnqueueForNewUserAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ValidRequest_When_RegisterAsync_Then_CreatesUser_EnqueuesVerification_And_ReturnsUser()
    {
        // Arrange
        const string plainPassword = "P@ssw0rd!";
        const string hashedResult = "BCrypt_Hash_XYZ"; // Dummy string

        _turnstile.Setup(x => x.ValidateAsync("ok", It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(true);

        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>()))
              .ReturnsAsync(false);

        // 3. Setup the Mock Password Service
        _passwordService.Setup(x => x.Hash(plainPassword))
                        .Returns(hashedResult);

        UserModel? created = null;
        _users.Setup(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()))
              .Callback<UserModel, CancellationToken>((u, _) => created = u)
              .ReturnsAsync(true);

        _users.Setup(x => x.UpsertUserPreferencesAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync(true);

        _verification.Setup(x => x.EnqueueForNewUserAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
                     .Returns(Task.CompletedTask);

        // Act
        var r = await SUT().RegisterAsync(
            " Linus ", " Steen ", "USER@EXAMPLE.COM", plainPassword,
            "ok", "", "sv-SE", null, trustedSeed: false, CancellationToken.None);

        // Assert
        r.IsSuccess.Should().BeTrue();

        created.Should().NotBeNull();
        created!.Email.Should().Be("user@example.com"); // normalized

        // 4. Verify the password was hashed before saving
        created.Password.Should().Be(hashedResult);
        created.Password.Should().NotBe(plainPassword);

        _passwordService.Verify(x => x.Hash(plainPassword), Times.Once);
        _verification.Verify(x => x.EnqueueForNewUserAsync(created.PersoId, "user@example.com", "sv-SE", It.IsAny<CancellationToken>()), Times.Once);
    }
}