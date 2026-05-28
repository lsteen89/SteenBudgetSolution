using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Savings;

namespace Backend.Application.Abstractions.Infrastructure.Data;

// Per-month base-savings ("Bassparande") writes — the single scalar held in
// `BudgetMonthSavings.MonthlySavings` and `Savings.MonthlySavings`. Kept
// separate from `IBudgetMonthSavingsGoalMutationRepository` so the goal repo
// stays focused on goal/method behaviour and the base-savings slice has its
// own narrow surface to mock.
public interface IBudgetMonthBaseSavingsMutationRepository
{
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(
        Guid budgetMonthId,
        CancellationToken ct);

    // Returns the per-month savings row with the fields the patch handler
    // needs (orphan detection + no-op detection). Null when the month has no
    // `BudgetMonthSavings` row materialised for some reason; the handler
    // surfaces that as `BaseSavings.NotFound`.
    Task<BudgetMonthBaseSavingsMutationReadModel?> GetBudgetMonthBaseSavingsForEditAsync(
        Guid budgetMonthId,
        CancellationToken ct);

    // `UPDATE BudgetMonthSavings SET MonthlySavings = @MonthlySavings,
    //  IsOverride = 1, UpdatedAt, UpdatedByUserId WHERE Id = @Id`.
    Task UpdateMonthBaseSavingsAsync(
        UpdateBudgetMonthBaseSavingsModel model,
        CancellationToken ct);

    // `UPDATE Savings SET MonthlySavings = @MonthlySavings, UpdatedAt,
    //  UpdatedByUserId WHERE Id = @SavingsId`. Used by plan-writing scopes
    //  only. Does not cascade to other already-materialised open months —
    //  matches the goal-contribution applier behaviour.
    Task UpdateBaselineBaseSavingsAsync(
        UpdateBaselineBaseSavingsModel model,
        CancellationToken ct);
}
