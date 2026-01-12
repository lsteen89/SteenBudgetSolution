using Backend.Domain.Shared;
using Backend.Application.DTO.Budget.Income;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IIncomeTarget : IWizardFinalizationTarget
{
    Task<Result> ApplyIncomeAsync(IncomeData dto, CancellationToken ct);
}

