using Backend.Application.Abstractions.Messaging;
using Backend.Application.DTO.Budget.Dashboard;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Wizard.FinalizationPreview;

public sealed record GetWizardFinalizationPreviewQuery(Guid SessionId)
    : IQuery<Result<BudgetDashboardDto>>;
