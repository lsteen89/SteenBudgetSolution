using Backend.Application.Features.Budgets.Dashboard;

namespace Backend.Application.Features.Budgets.Months.NextPreview;

/// <summary>
/// Builds a <see cref="BudgetDashboardReadModel"/> from active budget-plan rows
/// without materialising a month. The result feeds the shared
/// <see cref="Backend.Application.Abstractions.Application.Services.Budget.Projections.IBudgetDashboardProjector"/>
/// so preview math is identical to the live dashboard's math.
/// </summary>
public interface INextMonthPreviewReadModelBuilder
{
    BudgetDashboardReadModel Build(Guid budgetId, BudgetPlanSeed seed);
}
