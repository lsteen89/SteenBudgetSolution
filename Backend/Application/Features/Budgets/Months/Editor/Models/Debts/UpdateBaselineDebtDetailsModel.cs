namespace Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

// Update payload for the Debt PR 2 "edit details" command on a baseline `Debt`
// plan row. Distinct from `UpdateBaselineDebtModel`, which is the narrow
// planned-payment-only update used by the existing patch endpoint.
//
// Balance is intentionally absent — balance changes are owned by PR 3's
// dedicated `Uppdatera saldo` command. Source lifecycle is not touched here
// either: PR 4 owns lifecycle transitions.
public sealed record UpdateBaselineDebtDetailsModel(
    Guid DebtId,
    string Name,
    string Type,
    decimal Apr,
    decimal? MonthlyFee,
    decimal? MinPayment,
    int? TermMonths,
    decimal MonthlyPayment,
    Guid ActorPersoid,
    DateTime UtcNow);
