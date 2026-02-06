using System;
using Backend.Application.Features.Wizard.Finalization.Orchestration;
using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using FluentAssertions;
using Moq;
using Backend.Domain.Entities.Wizard;
using Backend.Application.Abstractions.Infrastructure.Data;

public sealed class WizardFinalizationOrchestratorTests
{
    [Fact]
    public async Task RunAsync_MergesSubSteps_PerStep_AndProcessesOnce()
    {
        // Arrange
        var sessionId = Guid.NewGuid();

        var rows = new List<WizardStepRowEntity>
        {
            new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 1, UpdatedAt = Utc(10,0), StepData = @"{""intro"":{""hasDebts"":true}}", DataVersion = 1 },
            new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 2, UpdatedAt = Utc(10,1), StepData = @"{""debts"":[{""name"":""Kreditkort"",""type"":""revolving"",""balance"":15000,""apr"":19.95}]}", DataVersion = 1 },
            new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 3, UpdatedAt = Utc(10,2), StepData = @"{""summary"":{""repaymentStrategy"":""snowball""}}", DataVersion = 1 },
        };

        var repo = new Mock<IWizardRepository>();
        repo.Setup(r => r.GetRawStepDataForFinalizationAsync(sessionId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(rows);

        var p4 = new Mock<IWizardStepProcessor>();
        p4.SetupGet(p => p.StepNumber).Returns(4);

        string? receivedJson = null;
        p4.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IWizardFinalizationTarget>(), It.IsAny<CancellationToken>()))
          .Callback<string, IWizardFinalizationTarget, CancellationToken>((json, _, __) => receivedJson = json)
          .ReturnsAsync(Result.Success());

        var sut = new WizardStepOrchestrator(repo.Object, new[] { p4.Object });

        // Act
        var res = await sut.RunAsync(sessionId, Mock.Of<IWizardFinalizationTarget>(), CancellationToken.None);

        // Assert
        res.IsSuccess.Should().BeTrue();
        p4.Verify(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IWizardFinalizationTarget>(), It.IsAny<CancellationToken>()), Times.Once);

        receivedJson.Should().NotBeNull();
        receivedJson!.Should().Contain(@"""intro""");
        receivedJson.Should().Contain(@"""debts""");
        receivedJson.Should().Contain(@"""summary""");
        receivedJson.Should().Contain(@"""repaymentStrategy"":""snowball""");
    }
    [Fact]
    public async Task RunAsync_UsesLatestRow_PerSubStep_BeforeMerge()
    {
        var sessionId = Guid.NewGuid();

        var rows = new List<WizardStepRowEntity>
    {
        // Older debts
        new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 2, UpdatedAt = Utc(10,0), StepData = @"{""debts"":[{""name"":""OLD""}]}", DataVersion = 1 },
        // Newer debts (same step+substep)
        new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 2, UpdatedAt = Utc(10,5), StepData = @"{""debts"":[{""name"":""NEW""}]}", DataVersion = 1 },
        // Summary
        new() { WizardSessionId = sessionId, StepNumber = 4, SubStep = 3, UpdatedAt = Utc(10,6), StepData = @"{""summary"":{""repaymentStrategy"":""avalanche""}}", DataVersion = 1 },
    };

        var repo = new Mock<IWizardRepository>();
        repo.Setup(r => r.GetRawStepDataForFinalizationAsync(sessionId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(rows);

        var p4 = new Mock<IWizardStepProcessor>();
        p4.SetupGet(p => p.StepNumber).Returns(4);

        string? receivedJson = null;
        p4.Setup(p => p.ProcessAsync(It.IsAny<string>(), It.IsAny<IWizardFinalizationTarget>(), It.IsAny<CancellationToken>()))
          .Callback<string, IWizardFinalizationTarget, CancellationToken>((json, _, __) => receivedJson = json)
          .ReturnsAsync(Result.Success());

        var sut = new WizardStepOrchestrator(repo.Object, new[] { p4.Object });

        var res = await sut.RunAsync(sessionId, Mock.Of<IWizardFinalizationTarget>(), CancellationToken.None);

        res.IsSuccess.Should().BeTrue();
        receivedJson.Should().Contain(@"""NEW""");
        receivedJson.Should().NotContain(@"""OLD""");
    }

    private static DateTime Utc(int hour, int minute) =>
        new DateTime(2026, 1, 1, hour, minute, 0, DateTimeKind.Utc);
}
