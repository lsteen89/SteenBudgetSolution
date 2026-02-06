using Backend.Domain.Entities.Wizard;
using Backend.Application.Features.Wizard.GetWizardData.Abstractions;

namespace Backend.Application.Features.Wizard.GetWizardData.Reduce;

public sealed class WizardStepRowReducer : IWizardStepRowReducer
{
    public ILookup<int, WizardStepRowEntity> Reduce(IEnumerable<WizardStepRowEntity> rawRows)
    {
        // materialize once
        var list = rawRows as IList<WizardStepRowEntity> ?? rawRows.ToList();
        if (list.Count == 0)
            return Enumerable.Empty<WizardStepRowEntity>().ToLookup(_ => 0);

        // Latest per (StepNumber, SubStep) by UpdatedAt, tie-break by 
        return list
            .GroupBy(r => new { r.StepNumber, r.SubStep })
            .Select(g => g
                .OrderByDescending(x => x.UpdatedAt)
                .ThenByDescending(x => x.DataVersion)
                .First())
            .ToLookup(r => r.StepNumber);
    }
}
