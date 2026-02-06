using System;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Backend.Application.Features.Wizard.GetWizardData.Assemble;
using Backend.Domain.Entities.Wizard;

namespace Backend.Tests.UnitTests.Features.Wizard;

public sealed class WizardStepDataAssemblerTests
{
    private readonly WizardStepDataAssembler _sut = new();

    private sealed record SimpleDto(string? A, string? B);

    [Fact]
    public void AssembleSingle_PicksNewestByUpdatedAt()
    {
        var rows = new[]
        {
            new WizardStepRowEntity { StepData = @"{""a"":""old""}", UpdatedAt = new DateTime(2026,1,1), DataVersion = 1 },
            new WizardStepRowEntity { StepData = @"{""a"":""new""}", UpdatedAt = new DateTime(2026,1,2), DataVersion = 1 },
        };

        var dto = _sut.AssembleSingle<SimpleDto>(rows);

        dto!.A.Should().Be("new");
    }

    [Fact]
    public void AssembleMulti_MergesBySubStep_OrderMatters_LaterOverwrites()
    {
        var rows = new[]
        {
            new WizardStepRowEntity { SubStep = 1, StepData = @"{""a"":""v1"",""b"":""x""}", UpdatedAt = DateTime.UtcNow, DataVersion = 1 },
            new WizardStepRowEntity { SubStep = 2, StepData = @"{""a"":""v2""}", UpdatedAt = DateTime.UtcNow, DataVersion = 1 },
        };

        var dto = _sut.AssembleMulti<SimpleDto>(rows);

        dto!.A.Should().Be("v2"); // overwritten
        dto.B.Should().Be("x");   // preserved
    }
}

