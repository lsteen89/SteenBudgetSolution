using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using MediatR;
using Moq;
using Xunit;

using Backend.Application.Features.Commands.Auth.Register;
using Backend.Application.Features.Events.Register;
using Backend.Application.Abstractions.Infrastructure.Security;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Users;
using Backend.Domain.Entities.User;

namespace Backend.Tests.UnitTests.Features.Authentication.Register;

public sealed class RegisterUserCommandHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IMediator> _mediator = new();
    private readonly Mock<IRecaptchaService> _recaptcha = new();

    private RegisterUserCommandHandler SUT()
        => new(_users.Object, _mediator.Object, _recaptcha.Object);

    private static RegisterUserCommand Cmd(
        string first = "Linus",
        string last = "Steen",
        string email = "user@example.com",
        string pwd = "P@ssw0rd!",
        string captcha = "ok",
        string? honeypot = null)
        => new(first, last, email, pwd, captcha, honeypot);

    // -------- Tests --------

    [Fact]
    public async Task Given_InvalidCaptcha_When_Handle_Then_Returns_InvalidCaptcha()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("bad")).ReturnsAsync(false);

        var result = await SUT().Handle(Cmd(captcha: "bad"), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be(UserErrors.InvalidCaptcha);
        _users.VerifyNoOtherCalls();
        _mediator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_HoneypotFilled_When_Handle_Then_Returns_Success_And_NoSideEffects()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);

        var result = await SUT().Handle(Cmd(honeypot: "I am a bot"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _users.VerifyNoOtherCalls();
        _mediator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Given_EmailAlreadyExists_When_Handle_Then_Returns_EmailAlreadyExists_And_NoCreate_NoEvent()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var result = await SUT().Handle(Cmd(), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be(UserErrors.EmailAlreadyExists);
        _users.Verify(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()), Times.Never);
        _mediator.Verify(x => x.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_CreateUserFails_When_Handle_Then_Returns_RegistrationFailed_And_NoEvent()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _users.Setup(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var result = await SUT().Handle(Cmd(), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Be(UserErrors.RegistrationFailed);
        _mediator.Verify(x => x.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Given_ValidRequest_When_Handle_Then_CreatesUser_WithHashedPwd_DefaultRole_And_PublishesEvent()
    {
        _recaptcha.Setup(x => x.ValidateTokenAsync("ok")).ReturnsAsync(true);
        _users.Setup(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>())).ReturnsAsync(false);

        UserModel? created = null;
        _users.Setup(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()))
              .Callback<UserModel, CancellationToken>((u, _) => created = u)
              .ReturnsAsync(true);

        UserRegisteredEvent? published = null;
        _mediator.Setup(m => m.Publish(It.IsAny<UserRegisteredEvent>(), It.IsAny<CancellationToken>()))
                 .Callback<INotification, CancellationToken>((e, _) => published = (UserRegisteredEvent)e)
                 .Returns(Task.CompletedTask);

        var cmd = Cmd(pwd: "P@ssw0rd!");
        var result = await SUT().Handle(cmd, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();

        created.Should().NotBeNull();
        created!.Email.Should().Be("user@example.com");
        created.Roles.Should().Be("1");
        created.PersoId.Should().NotBe(Guid.Empty);
        // bcrypt verification
        BCrypt.Net.BCrypt.Verify("P@ssw0rd!", created.Password).Should().BeTrue();

        published.Should().NotBeNull();
        published!.UserId.Should().Be(created.PersoId);
        published.Email.Should().Be(created.Email);

        _users.Verify(x => x.UserExistsAsync("user@example.com", It.IsAny<CancellationToken>()), Times.Once);
        _users.Verify(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>()), Times.Once);
        _mediator.Verify(x => x.Publish(It.IsAny<UserRegisteredEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Given_AllowTestEmailsEnv_And_WhitelistedEmail_When_Handle_Then_SkipsCaptcha()
    {
        try
        {
            Environment.SetEnvironmentVariable("ALLOW_TEST_EMAILS", "true");
            // If bypass works, this must NOT be called at all
            _recaptcha.Setup(x => x.ValidateTokenAsync(It.IsAny<string>())).ReturnsAsync(false);

            _users.Setup(x => x.UserExistsAsync("l@l.se", It.IsAny<CancellationToken>())).ReturnsAsync(false);
            _users.Setup(x => x.CreateUserAsync(It.IsAny<UserModel>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var result = await SUT().Handle(Cmd(email: "l@l.se"), CancellationToken.None);

            result.IsSuccess.Should().BeTrue();
            _recaptcha.Verify(x => x.ValidateTokenAsync(It.IsAny<string>()), Times.Never);
            _mediator.Verify(x => x.Publish(It.IsAny<UserRegisteredEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        }
        finally
        {
            Environment.SetEnvironmentVariable("ALLOW_TEST_EMAILS", null);
        }
    }
}
