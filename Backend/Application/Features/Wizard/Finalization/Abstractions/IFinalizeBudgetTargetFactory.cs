namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IFinalizeBudgetTargetFactory
{
    IWizardFinalizationTarget Create(Guid budgetId);
}