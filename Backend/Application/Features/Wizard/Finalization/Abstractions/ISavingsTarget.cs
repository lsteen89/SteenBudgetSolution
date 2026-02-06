using Backend.Domain.Shared;
using Backend.Application.DTO.Budget.Savings;

namespace Backend.Application.Features.Wizard.Finalization.Abstractions;

public interface ISavingsTarget : IWizardFinalizationTarget
{
    Task<Result> ApplySavingsAsync(SavingsData dto, CancellationToken ct);
}

