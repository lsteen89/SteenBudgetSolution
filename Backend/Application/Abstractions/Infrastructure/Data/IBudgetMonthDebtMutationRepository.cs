using Backend.Application.Features.Budgets.Months.Editor.Models;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

namespace Backend.Application.Abstractions.Infrastructure.Data;

public interface IBudgetMonthDebtMutationRepository
{
    Task<BudgetMonthMutationMetaReadModel?> GetBudgetMonthMetaAsync(Guid budgetMonthId, CancellationToken ct);

    Task<IReadOnlyList<BudgetMonthDebtEditorRowReadModel>> GetDebtEditorRowsAsync(
        Guid budgetMonthId,
        bool includeDeleted,
        CancellationToken ct);

    Task<BudgetMonthDebtMutationReadModel?> GetDebtForMutationAsync(
        Guid budgetMonthId,
        Guid monthDebtId,
        CancellationToken ct);

    Task UpdateMonthDebtMonthlyPaymentAsync(
        UpdateBudgetMonthDebtModel model,
        CancellationToken ct);

    Task<bool> BaselineDebtExistsAsync(
        Guid debtId,
        CancellationToken ct);

    /// <summary>
    /// Reads the persisted planned monthly payment from baseline <c>Debt</c>.
    /// Returns <c>null</c> when the baseline row does not exist. Required so
    /// the audit pipeline can record the real before-value when a budget-plan
    /// scope mutation only touches the baseline (e.g. <c>budgetPlanOnly</c>),
    /// where the month-row value would be a lie.
    /// </summary>
    Task<decimal?> GetBaselineDebtMonthlyPaymentAsync(
        Guid debtId,
        CancellationToken ct);

    Task UpdateBaselineDebtMonthlyPaymentAsync(
        UpdateBaselineDebtModel model,
        CancellationToken ct);

    // --- Debt PR 2: create + edit-metadata surface -----------------------

    /// <summary>
    /// Resolves the owning <c>Budget.Id</c> for a given <c>BudgetMonth.Id</c>.
    /// Returns <c>null</c> when the month does not exist. Used by the create
    /// handler when scope writes a baseline <c>Debt</c> plan row, because
    /// <c>Debt.BudgetId</c> is the foreign-key parent and the API only carries
    /// <c>BudgetMonthId</c> context.
    /// </summary>
    Task<BudgetMonthDebtForCreateReadModel?> GetBudgetMonthForDebtCreateAsync(
        Guid budgetMonthId,
        CancellationToken ct);

    /// <summary>
    /// Inserts a new baseline <c>Debt</c> plan row. Source lifecycle defaults
    /// to <c>active</c> at the SQL layer.
    /// </summary>
    Task InsertBaselineDebtAsync(
        InsertBaselineDebtModel model,
        CancellationToken ct);

    /// <summary>
    /// Inserts a new <c>BudgetMonthDebt</c> row created from the editor (Debt
    /// PR 2). Always sets <c>Status = 'active'</c>,
    /// <c>ParticipationStatus = 'included'</c>, and <c>IsOverride = 0</c> —
    /// a freshly created row is neither closed, excluded, nor an override of a
    /// materialized baseline.
    /// </summary>
    Task InsertMonthDebtAsync(
        InsertBudgetMonthDebtModel model,
        CancellationToken ct);

    /// <summary>
    /// Reads the full baseline metadata snapshot for an existing <c>Debt</c>
    /// plan row. Plan-writing detail patches use the snapshot to capture
    /// honest before-values in audit JSON instead of inferring them from the
    /// (possibly diverged) month row.
    /// </summary>
    Task<BudgetMonthDebtBaselineSnapshotReadModel?> GetBaselineDebtSnapshotAsync(
        Guid debtId,
        CancellationToken ct);

    /// <summary>
    /// Updates the metadata columns on a <c>BudgetMonthDebt</c> row. Balance
    /// is intentionally not touched here — balance is owned by PR 3's
    /// dedicated balance-adjustment command.
    /// </summary>
    Task UpdateMonthDebtDetailsAsync(
        UpdateBudgetMonthDebtDetailsModel model,
        CancellationToken ct);

    /// <summary>
    /// Updates the metadata columns on a baseline <c>Debt</c> plan row.
    /// Balance and lifecycle columns are intentionally not touched here.
    /// </summary>
    Task UpdateBaselineDebtDetailsAsync(
        UpdateBaselineDebtDetailsModel model,
        CancellationToken ct);

    // --- Debt PR 3: balance-adjustment surface ----------------------------

    /// <summary>
    /// Reads the persisted liability balance from baseline <c>Debt</c>. Returns
    /// <c>null</c> when the baseline row does not exist. Plan-writing balance
    /// adjustments use this to capture an honest <c>oldBalance</c> for the
    /// audit row — the month-side value may have diverged from the plan and
    /// cannot stand in.
    /// </summary>
    Task<decimal?> GetBaselineDebtBalanceAsync(
        Guid debtId,
        CancellationToken ct);

    /// <summary>
    /// Updates only the <c>Balance</c> column on a <c>BudgetMonthDebt</c> row.
    /// Planned-payment and metadata columns are intentionally untouched so the
    /// "saldo påverkas inte här" callout in the planned-payment drawer stays
    /// truthful in the inverse direction as well.
    /// </summary>
    Task UpdateMonthDebtBalanceAsync(
        UpdateBudgetMonthDebtBalanceModel model,
        CancellationToken ct);

    /// <summary>
    /// Updates only the <c>Balance</c> column on a baseline <c>Debt</c> plan row.
    /// Lifecycle columns (<c>Status</c>, <c>PaidOffAt</c>, …) are intentionally
    /// untouched — a balance reaching zero is never an implicit paid-off.
    /// </summary>
    Task UpdateBaselineDebtBalanceAsync(
        UpdateBaselineDebtBalanceModel model,
        CancellationToken ct);
}
