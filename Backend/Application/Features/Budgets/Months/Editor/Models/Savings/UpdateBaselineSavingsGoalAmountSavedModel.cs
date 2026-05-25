namespace Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

/// <summary>
/// Plan-baseline write for a V2 one-time transfer. The handler also drives
/// the new <see cref="AmountSaved"/> here so future month materialisations
/// (which clone from the baseline) see the deposit.
/// </summary>
public sealed record UpdateBaselineSavingsGoalAmountSavedModel(
    Guid SavingsGoalId,
    decimal AmountSaved,
    Guid ActorPersoid,
    DateTime UtcNow);
