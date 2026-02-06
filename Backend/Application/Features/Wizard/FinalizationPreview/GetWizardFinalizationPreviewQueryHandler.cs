using Backend.Application.Abstractions.Messaging;
using Backend.Application.Abstractions.Application.Services.Budget.Projections;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Shared;
using Backend.Application.Features.Wizard.Finalization.Abstractions;
using Backend.Application.Features.Wizard.FinalizationPreview.Models;

namespace Backend.Application.Features.Wizard.FinalizationPreview;

public sealed class GetWizardFinalizationPreviewQueryHandler
    : IQueryHandler<GetWizardFinalizationPreviewQuery, Result<BudgetDashboardDto>>
{
    private readonly IWizardStepOrchestrator _orchestrator;
    private readonly IWizardPreviewReadModelBuilder _previewBuilder;
    private readonly IBudgetDashboardProjector _projector;

    public GetWizardFinalizationPreviewQueryHandler(
        IWizardStepOrchestrator orchestrator,
        IWizardPreviewReadModelBuilder previewBuilder,
        IBudgetDashboardProjector projector)
    {
        _orchestrator = orchestrator;
        _previewBuilder = previewBuilder;
        _projector = projector;
    }

    public async Task<Result<BudgetDashboardDto>> Handle(GetWizardFinalizationPreviewQuery request, CancellationToken ct)
    {
        var target = new PreviewBudgetTarget();
        await _orchestrator.RunAsync(request.SessionId, target, ct);
        var readModel = _previewBuilder.Build(target);
        var dto = _projector.Project(readModel, target.CarryOverAmountMonthly);

        return Result<BudgetDashboardDto>.Success(dto);
    }
}
