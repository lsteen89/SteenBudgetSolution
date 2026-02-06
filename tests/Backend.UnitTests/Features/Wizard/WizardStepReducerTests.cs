using FluentAssertions;
using Backend.Application.Features.Wizard.GetWizardData.Reduce;
using Backend.Domain.Entities.Wizard;

namespace Backend.Tests.UnitTests.Features.Wizard;

public sealed class WizardStepReducerTests
{
    [Fact]
    public void Reduce_PicksLatestPerStepAndSubStep()
    {
        var reducer = new WizardStepRowReducer();
        var t1 = new DateTime(2026, 1, 1);
        var t2 = new DateTime(2026, 1, 2);

        var rows = new[]
        {
            new WizardStepRowEntity { StepNumber = 3, SubStep = 1, UpdatedAt = t1, DataVersion = 1, StepData = "{}" },
            new WizardStepRowEntity { StepNumber = 3, SubStep = 1, UpdatedAt = t2, DataVersion = 1, StepData = "{\"x\":1}" },
        };

        var latest = reducer.Reduce(rows);

        latest[3].Single().StepData.Should().Be("{\"x\":1}");
    }
}

