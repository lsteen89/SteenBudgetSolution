using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

using Backend.Application.Abstractions.Application.Orchestrators;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Entities.User;
using Backend.Domain.Shared;
using Backend.Application.Features.Authentication.Register.ResendVerificationMail; // adjust

namespace Backend.UnitTests.Features.Authentication.Verify;

public sealed class ResendVerificationCommandHandlerTests
{
    [Fact]
    public async Task Given_UserNotFound_When_Resend_Then_SilentSuccess_And_NoOrchestratorCall()
    {
        var users = new Mock<IUserRepository>();
        var ver = new Mock<IVerificationTokenRepository>();
        users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>()))
             .ReturnsAsync((UserModel?)null);

        var orch = new Mock<IVerificationCodeOrchestrator>();

        var sut = new ResendVerificationCommandHandler(
            users.Object,
            ver.Object,
            orch.Object,
            NullLogger<ResendVerificationCommandHandler>.Instance);

        var res = await sut.Handle(new ResendVerificationCommand("u@e.se"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        orch.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_EmailAlreadyConfirmed_When_Resend_Then_SilentSuccess_And_NoOrchestratorCall()
    {
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Email = "u@e.se",
            EmailConfirmed = true,
            Password = "x"
        };

        var users = new Mock<IUserRepository>();
        var ver = new Mock<IVerificationTokenRepository>();
        users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        var orch = new Mock<IVerificationCodeOrchestrator>();

        var sut = new ResendVerificationCommandHandler(
            users.Object,
            ver.Object,
            orch.Object,
            NullLogger<ResendVerificationCommandHandler>.Instance);

        var res = await sut.Handle(new ResendVerificationCommand("u@e.se"), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        orch.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserExists_NotConfirmed_When_Resend_Then_OrchestratorCalled_With_NormalizedEmail()
    {
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Email = "u@e.se",
            EmailConfirmed = false,
            Password = "x",
            FirstName = "T",
            LastName = "U",
            Roles = "1",
        };

        var users = new Mock<IUserRepository>();
        var ver = new Mock<IVerificationTokenRepository>(); // unused by handler, but ctor needs it

        // handler normalizes input to lower+trim before calling repo
        users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);
        users.Setup(r => r.GetUserLocaleAsync(user.PersoId, It.IsAny<CancellationToken>()))
            .ReturnsAsync("sv-SE");

        var orch = new Mock<IVerificationCodeOrchestrator>();
        orch.Setup(o => o.EnqueueForResendAsync(user.PersoId, "u@e.se", "sv-SE", It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var sut = new ResendVerificationCommandHandler(
            users.Object,
            ver.Object,
            orch.Object,
            NullLogger<ResendVerificationCommandHandler>.Instance);

        var res = await sut.Handle(new ResendVerificationCommand("  U@E.SE  "), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        orch.Verify(o => o.EnqueueForResendAsync(user.PersoId, "u@e.se", "sv-SE", It.IsAny<CancellationToken>()), Times.Once);
        orch.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_UserExists_Confirmed_When_Resend_Then_SilentSuccess_And_NoOrchestratorCall()
    {
        var user = new UserModel
        {
            PersoId = Guid.NewGuid(),
            Email = "u@e.se",
            EmailConfirmed = true,
            Password = "x",
            FirstName = "T",
            LastName = "U",
            Roles = "1",
        };

        var users = new Mock<IUserRepository>();
        var ver = new Mock<IVerificationTokenRepository>();
        var orch = new Mock<IVerificationCodeOrchestrator>();

        users.Setup(r => r.GetUserModelAsync(null, "u@e.se", It.IsAny<CancellationToken>()))
             .ReturnsAsync(user);

        var sut = new ResendVerificationCommandHandler(
            users.Object,
            ver.Object,
            orch.Object,
            NullLogger<ResendVerificationCommandHandler>.Instance);

        var res = await sut.Handle(new ResendVerificationCommand("  U@E.SE  "), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        orch.VerifyNoOtherCalls();
    }

}
