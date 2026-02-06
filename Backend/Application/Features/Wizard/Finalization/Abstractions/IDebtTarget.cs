using Backend.Domain.Shared;
using Backend.Application.DTO.Budget.Debt;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IDebtTarget : IWizardFinalizationTarget
{
    Task<Result> ApplyDebtAsync(DebtData dto, CancellationToken ct);
}
