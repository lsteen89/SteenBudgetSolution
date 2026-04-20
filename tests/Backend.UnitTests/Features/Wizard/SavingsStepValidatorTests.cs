using System;
using System.Collections.Generic;
using Backend.Application.Features.Wizard.GetWizardData.Assemble;
using Backend.Application.Features.Wizard.SaveStep;
using Backend.Application.Models.Wizard;
using Backend.Application.Validators.WizardValidation;
using Backend.Domain.Entities.Wizard;
using FluentAssertions;

namespace Backend.UnitTests.Features.Wizard;

public sealed class SavingsStepValidatorTests
{
    [Fact]
    public void ValidateAndSerialize_Persists_PreferNot_And_Assembler_Resumes_It()
    {
        var validator = new SavingsStepValidator(new SavingsValidator());
        var assembler = new WizardStepDataAssembler();

        var result = validator.ValidateAndSerialize("""
        {
          "habits": {
            "monthlySavings": 250,
            "savingMethods": ["preferNot"]
          }
        }
        """);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Contain("\"preferNot\"");

        var resumed = assembler.AssembleSingle<SavingsFormValues>(new[]
        {
            new WizardStepRowEntity
            {
                StepData = result.Value!,
                UpdatedAt = DateTime.UtcNow,
                DataVersion = 1
            }
        });

        resumed.Should().NotBeNull();
        resumed!.Habits.Should().NotBeNull();
        resumed.Habits!.SavingMethods.Should().BeEquivalentTo(new List<SavingMethod>
        {
            SavingMethod.PreferNot
        });
    }
}
