using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Moq;
using Xunit;
using Microsoft.Extensions.Logging;

using Backend.Application.Features.Wizard.StartWizard;
using Backend.Application.Abstractions.Infrastructure.Data;
using Backend.Domain.Shared;

namespace Backend.Tests.UnitTests.Features.Wizard;

public sealed class StartWizardCommandHandlerTests
{
    private readonly Mock<IWizardRepository> _repo = new();
    private readonly Mock<ILogger<StartWizardCommandHandler>> _log = new();

    private StartWizardCommandHandler SUT() => new(_repo.Object, _log.Object);

    [Fact]
    public async Task Given_ExistingSession_When_Start_Then_ReturnExisting_And_DoNotCreate()
    {
        // Arrange
        var persoId = Guid.NewGuid();
        var existing = Guid.NewGuid();
        var ct = new CancellationTokenSource().Token;

        _repo.Setup(r => r.GetSessionIdByPersoIdAsync(persoId, ct))
             .ReturnsAsync(existing);

        // Act
        var res = await SUT().Handle(new StartWizardCommand(persoId), ct);

        // Assert
        res.IsSuccess.Should().BeTrue();
        res.Value.Should().Be(existing);

        _repo.Verify(r => r.CreateSessionAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);

        _log.VerifyLogged(LogLevel.Information, "already has wizard session", Times.Once());
    }

    [Fact]
    public async Task Given_NoExistingSession_When_Start_Then_Create_And_ReturnNew()
    {
        // Arrange
        var persoId = Guid.NewGuid();
        var created = Guid.NewGuid();
        var ct = new CancellationTokenSource().Token;

        _repo.Setup(r => r.GetSessionIdByPersoIdAsync(persoId, ct))
             .ReturnsAsync((Guid?)null);
        _repo.Setup(r => r.CreateSessionAsync(persoId, ct))
             .ReturnsAsync(created);

        // Act
        var res = await SUT().Handle(new StartWizardCommand(persoId), ct);

        // Assert
        res.IsSuccess.Should().BeTrue();
        res.Value.Should().Be(created);

        _repo.Verify(r => r.CreateSessionAsync(persoId, ct), Times.Once);
        _log.VerifyLogged(LogLevel.Information, "Creating new wizard session", Times.Once());
    }

    [Fact]
    public async Task Given_GetReturnsEmpty_When_Start_Then_Create_And_ReturnNew()
    {
        // Arrange
        var persoId = Guid.NewGuid();
        var created = Guid.NewGuid();
        var ct = new CancellationTokenSource().Token;

        _repo.Setup(r => r.GetSessionIdByPersoIdAsync(persoId, ct))
             .ReturnsAsync(Guid.Empty); // treat as no session
        _repo.Setup(r => r.CreateSessionAsync(persoId, ct))
             .ReturnsAsync(created);

        // Act
        var res = await SUT().Handle(new StartWizardCommand(persoId), ct);

        // Assert
        res.IsSuccess.Should().BeTrue();
        res.Value.Should().Be(created);
        _repo.Verify(r => r.CreateSessionAsync(persoId, ct), Times.Once);
    }

    [Fact]
    public async Task Given_CreateReturnsEmpty_When_Start_Then_Failure_WithError()
    {
        // Arrange
        var persoId = Guid.NewGuid();
        var ct = new CancellationTokenSource().Token;

        _repo.Setup(r => r.GetSessionIdByPersoIdAsync(persoId, ct))
             .ReturnsAsync((Guid?)null);
        _repo.Setup(r => r.CreateSessionAsync(persoId, ct))
             .ReturnsAsync(Guid.Empty);

        // Act
        var res = await SUT().Handle(new StartWizardCommand(persoId), ct);

        // Assert
        res.IsSuccess.Should().BeFalse();
        res.Error.Should().NotBeNull();
        res.Error!.Code.Should().Be("Wizard.CreateFailed");

        _log.VerifyLogged(LogLevel.Error, "Failed to create wizard session", Times.Once());
    }

    [Fact]
    public async Task Given_CancellationToken_Is_Propagated_To_Repository()
    {
        // Arrange
        var persoId = Guid.NewGuid();
        var created = Guid.NewGuid();
        using var cts = new CancellationTokenSource();

        _repo.Setup(r => r.GetSessionIdByPersoIdAsync(
                persoId,
                It.Is<CancellationToken>(t => t == cts.Token)))
             .ReturnsAsync((Guid?)null);

        _repo.Setup(r => r.CreateSessionAsync(
                persoId,
                It.Is<CancellationToken>(t => t == cts.Token)))
             .ReturnsAsync(created);

        // Act
        var res = await SUT().Handle(new StartWizardCommand(persoId), cts.Token);

        // Assert
        res.IsSuccess.Should().BeTrue();
        res.Value.Should().Be(created);
        _repo.VerifyAll();
    }
}

/// <summary>
/// Tiny helper so we can assert logger messages without extra libs.
/// </summary>
internal static class LoggerMoqExtensions
{
    public static void VerifyLogged<T>(
        this Mock<ILogger<T>> logger,
        LogLevel level,
        string containsSubstring,
        Times times)
    {
        logger.Verify(l => l.Log(
                level,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, _) =>
                    v.ToString() != null && v.ToString()!.Contains(containsSubstring, StringComparison.OrdinalIgnoreCase)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            times);
    }
}
