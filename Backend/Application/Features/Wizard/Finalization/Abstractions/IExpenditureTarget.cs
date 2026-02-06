using Backend.Domain.Shared;
using Backend.Application.DTO.Budget.Expenditure;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface IExpenditureTarget : IWizardFinalizationTarget
{
    Task<Result> ApplyExpenditureAsync(ExpenditureData dto, CancellationToken ct);
}

