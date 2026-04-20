using System.Text.Json;
using Backend.Application.Abstractions.Infrastructure.System;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Application.DTO.Budget.Savings;
using Backend.Application.Features.Wizard.FinalizationPreview.Mapper;
using Backend.Application.Features.Wizard.FinalizationPreview.Models;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.Finalization.Processing.Processors;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Services.Budget.Projections;
using Backend.Application.Services.Debts;
using Backend.Application.Models.Wizard;
using Backend.Application.Validators.WizardValidation;
using Backend.Common.Utilities;
using Backend.Domain.Shared;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Backend.UnitTests.Features.Wizard;

public sealed class SavingsFavoritePayloadTests
{
    private sealed class FakeTimeProvider : ITimeProvider
    {
        public FakeTimeProvider(DateTime utcNow) => UtcNow = utcNow;
        public DateTime UtcNow { get; }
    }

    private readonly SavingsStepValidator _stepValidator = new(new SavingsValidator());

    [Fact]
    public void ValidateAndSerialize_LegacyPayloadWithoutIsFavorite_DefaultsToFalse()
    {
        const string payload = """
        {
          "goals": [
            {
              "id": "goal-1",
              "name": "Emergency fund",
              "targetAmount": 10000,
              "targetDate": "2030-01-01",
              "amountSaved": 2500
            }
          ]
        }
        """;

        var result = _stepValidator.ValidateAndSerialize(payload);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().NotBeNull();

        var serialized = JsonSerializer.Deserialize<SavingsFormValues>(
            result.Value!,
            JsonHelper.Camel);

        serialized.Should().NotBeNull();
        serialized!.Goals.Should().ContainSingle();
        serialized.Goals![0].IsFavorite.Should().BeFalse();
    }

    [Fact]
    public void ValidateAndSerialize_MoreThanOneFavorite_ReturnsValidationFailure()
    {
        const string payload = """
        {
          "goals": [
            {
              "id": "goal-1",
              "name": "Emergency fund",
              "targetAmount": 10000,
              "targetDate": "2030-01-01",
              "amountSaved": 2500,
              "isFavorite": true
            },
            {
              "id": "goal-2",
              "name": "Vacation",
              "targetAmount": 5000,
              "targetDate": "2030-06-01",
              "amountSaved": 500,
              "isFavorite": true
            }
          ]
        }
        """;

        var result = _stepValidator.ValidateAndSerialize(payload);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Validation.Failed");
        result.Error.Message.Should().Contain("Only one savings goal can be marked as favorite.");
    }

    [Fact]
    public async Task ProcessAsync_MoreThanOneFavorite_ReturnsFailure_AndDoesNotCallTarget()
    {
        const string payload = """
        {
          "goals": [
            {
              "name": "Emergency fund",
              "targetAmount": 10000,
              "targetDate": "2030-01-01",
              "amountSaved": 2500,
              "isFavorite": true
            },
            {
              "name": "Vacation",
              "targetAmount": 5000,
              "targetDate": "2030-06-01",
              "amountSaved": 500,
              "isFavorite": true
            }
          ]
        }
        """;

        var target = new Mock<ISavingsTarget>(MockBehavior.Strict);
        var sut = new SavingsStepProcessor(NullLogger<SavingsStepProcessor>.Instance);

        var result = await sut.ProcessAsync(payload, target.Object, CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Savings.InvalidData");
        result.Error.Message.Should().Be("Only one savings goal can be marked as favorite.");
        target.Verify(
            x => x.ApplySavingsAsync(It.IsAny<SavingsData>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task FinalizationPreview_PreservesFavoriteFlag_OnSavingsGoals()
    {
        var target = new PreviewBudgetTarget();
        var dto = new SavingsData
        {
            Goals =
            [
                new SavingsGoalDto
                {
                    Id = Guid.NewGuid(),
                    Name = "Emergency fund",
                    TargetAmount = 10000m,
                    TargetDate = new DateTime(2030, 1, 1),
                    AmountSaved = 2500m,
                    IsFavorite = true
                },
                new SavingsGoalDto
                {
                    Id = Guid.NewGuid(),
                    Name = "Vacation",
                    TargetAmount = 5000m,
                    TargetDate = new DateTime(2030, 6, 1),
                    AmountSaved = 500m,
                    IsFavorite = false
                }
            ]
        };

        await target.ApplySavingsAsync(dto, CancellationToken.None);

        var readModelBuilder = new WizardPreviewReadModelBuilder(
            new FakeTimeProvider(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)));
        var projector = new BudgetDashboardProjector(new DebtPaymentCalculator());

        BudgetDashboardDto preview = projector.Project(readModelBuilder.Build(target));

        preview.Savings.Should().NotBeNull();
        preview.Savings!.Goals.Should().HaveCount(2);
        preview.Savings.Goals.Should().ContainSingle(g => g.Name == "Emergency fund" && g.IsFavorite);
        preview.Savings.Goals.Should().ContainSingle(g => g.Name == "Vacation" && !g.IsFavorite);
    }
}
