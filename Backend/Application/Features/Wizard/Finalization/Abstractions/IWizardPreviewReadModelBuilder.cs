using Backend.Application.Features.Budgets.Dashboard;
using Backend.Application.Features.Wizard.FinalizationPreview.Models;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IWizardPreviewReadModelBuilder
{
    BudgetDashboardReadModel Build(PreviewBudgetTarget target);
}