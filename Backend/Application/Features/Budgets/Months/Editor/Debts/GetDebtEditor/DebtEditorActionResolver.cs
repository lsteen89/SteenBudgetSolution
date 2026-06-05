using Backend.Application.Constants;
using Backend.Application.DTO.Budget.Months.Editor.Debt;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.GetDebtEditor;

// Debt PR 5: maps one editor row's persisted state to the per-action
// permissions and disabled-reason codes the FE renders. The resolver is
// deliberately pure (no DB access, no time, no allocations beyond the
// returned list) so the read handler can call it row-by-row and tests can
// pin specific permission combinations without spinning up a database.
//
// Every `Can*` flag mirrors a backend command guard from PR 2–4:
//
//   CanEditPayment / CanEditDetails  → `DebtMutationGuard.EnsureMutable`
//   CanUpdateBalance                  → `DebtBalanceMutationGuard.EnsureMutable`
//   CanSkipThisMonth / CanIncludeThisMonth
//                                     → `SetBudgetMonthDebtParticipationCommandHandler`
//   CanMarkPaidOff                    → `MarkBudgetMonthDebtPaidOffCommandHandler`
//   CanArchive                        → `ArchiveBudgetMonthDebtCommandHandler`
//   CanRestore                        → `RestoreBudgetMonthDebtCommandHandler`
//   CanRemove                         → `RemoveBudgetMonthDebtCommandHandler`
//
// `DisabledReasons` is a deduped, stable-ordered list of state-derived
// codes from <see cref="BudgetMonthDebtEditorDisabledReasons"/>. The FE
// maps each code to localised copy and picks which code applies to which
// disabled action via its own lookup. The resolver does not pair codes to
// actions — that would couple this contract to FE copy decisions.
//
// If a guard's behaviour changes in a future PR, this resolver and its
// dedicated tests in `BudgetMonthDebtEditorReadModelTests` must move with it.
internal static class DebtEditorActionResolver
{
    /// <summary>
    /// Maps the row's source-lifecycle / participation pair to the visible
    /// ledger group. Precedence is: paidOff source → paid, archived source
    /// → archived, notIncluded participation → skipped, otherwise active.
    /// Month-only rows always land in `active` or `skipped` depending on
    /// participation.
    /// </summary>
    /// <remarks>
    /// `Removed` participation rows and source-deleted rows are filtered out
    /// upstream by the editor's read SQL, so they never reach this method
    /// under normal operation. If a future diagnostic surface re-includes
    /// them the resolver still runs without crashing — it emits the
    /// `sourceDeleted` reason code and groups the row as `active` (no
    /// dedicated precedence rule exists for `deleted`). Note that
    /// `CanSkipThisMonth` would still be `true` for an `included`
    /// participation row in that case, because skip is intentionally not
    /// source-lifecycle gated (mirroring the participation handler — going
    /// *out of* `included` doesn't depend on source state). A diagnostic
    /// surface that wants strict immutability for source-deleted rows
    /// should layer its own filter on top of the resolver's output.
    /// </remarks>
    public static string ResolveGroup(BudgetMonthDebtEditorAggregateReadModel row)
    {
        if (string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.PaidOff, StringComparison.OrdinalIgnoreCase))
            return BudgetMonthDebtEditorGroups.Paid;

        if (string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.Archived, StringComparison.OrdinalIgnoreCase))
            return BudgetMonthDebtEditorGroups.Archived;

        if (string.Equals(row.ParticipationStatus, BudgetMonthDebtParticipationStatuses.NotIncluded, StringComparison.OrdinalIgnoreCase))
            return BudgetMonthDebtEditorGroups.Skipped;

        return BudgetMonthDebtEditorGroups.Active;
    }

    /// <summary>
    /// Computes per-action permissions plus the deduped, stable-ordered list
    /// of state-derived disabled-reason codes for one row. Reasons describe
    /// row state, not action-specific failures — the FE matches each disabled
    /// action to a code via its own lookup.
    /// </summary>
    public static (DebtRowActionsDto Actions, IReadOnlyList<string> DisabledReasons) ResolveActions(
        BudgetMonthDebtEditorAggregateReadModel row,
        bool isReadOnly,
        string monthStatus)
    {
        var isMonthOnly = row.SourceDebtId is null;

        // -- Row-state predicates ----------------------------------------
        var rowRemoved = string.Equals(
            row.ParticipationStatus,
            BudgetMonthDebtParticipationStatuses.Removed,
            StringComparison.OrdinalIgnoreCase);
        var rowLegacyClosed = string.Equals(row.Status, "closed", StringComparison.OrdinalIgnoreCase);
        // Any of these blocks every row-level mutation.
        var rowAnyMutationBlocked = isReadOnly || rowRemoved || row.IsDeleted || rowLegacyClosed;

        var includedParticipation = string.Equals(
            row.ParticipationStatus,
            BudgetMonthDebtParticipationStatuses.Included,
            StringComparison.OrdinalIgnoreCase);
        var notIncludedParticipation = string.Equals(
            row.ParticipationStatus,
            BudgetMonthDebtParticipationStatuses.NotIncluded,
            StringComparison.OrdinalIgnoreCase);

        var sourcePaidOff  = string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.PaidOff,  StringComparison.OrdinalIgnoreCase);
        var sourceArchived = string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.Archived, StringComparison.OrdinalIgnoreCase);
        var sourceDeleted  = string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.Deleted,  StringComparison.OrdinalIgnoreCase);
        // "row has SourceDebtId but the linked Debt row is missing" — the
        // LEFT JOIN surfaces this as SourceDebtId not null + status null.
        var sourceMissing  = !isMonthOnly && row.SourceLifecycleStatus is null;
        var sourceActive   = !isMonthOnly && string.Equals(row.SourceLifecycleStatus, DebtSourceLifecycleStatuses.Active, StringComparison.OrdinalIgnoreCase);

        // -- Reasons (stable order, deduped) -----------------------------
        var reasons = new List<string>();

        // Month-level blockers first.
        if (isReadOnly)
        {
            reasons.Add(string.Equals(monthStatus, "skipped", StringComparison.OrdinalIgnoreCase)
                ? BudgetMonthDebtEditorDisabledReasons.MonthSkipped
                : BudgetMonthDebtEditorDisabledReasons.MonthClosed);
        }

        // Row-level blockers next.
        if (rowRemoved)        reasons.Add(BudgetMonthDebtEditorDisabledReasons.RowRemoved);
        if (row.IsDeleted)     reasons.Add(BudgetMonthDebtEditorDisabledReasons.RowDeleted);
        if (rowLegacyClosed)   reasons.Add(BudgetMonthDebtEditorDisabledReasons.RowClosed);

        // Row-shape (plan presence / participation).
        if (isMonthOnly)              reasons.Add(BudgetMonthDebtEditorDisabledReasons.MonthOnlyNoPlan);
        else                          reasons.Add(BudgetMonthDebtEditorDisabledReasons.SourceLinkedHistoryExists);
        if (includedParticipation)    reasons.Add(BudgetMonthDebtEditorDisabledReasons.AlreadyIncluded);
        if (notIncludedParticipation) reasons.Add(BudgetMonthDebtEditorDisabledReasons.AlreadyNotIncluded);

        // Source-level (only meaningful for plan-linked rows).
        if (sourcePaidOff)  reasons.Add(BudgetMonthDebtEditorDisabledReasons.SourcePaidOff);
        if (sourceArchived) reasons.Add(BudgetMonthDebtEditorDisabledReasons.SourceArchived);
        if (sourceDeleted)  reasons.Add(BudgetMonthDebtEditorDisabledReasons.SourceDeleted);
        if (sourceMissing)  reasons.Add(BudgetMonthDebtEditorDisabledReasons.SourceMissing);

        // -- Per-action permissions --------------------------------------

        // Edit payment / details: `DebtMutationGuard.EnsureMutable`.
        var canEditPayment = !rowAnyMutationBlocked
            && includedParticipation
            && (isMonthOnly || sourceActive);
        var canEditDetails = canEditPayment;

        // Update balance: `DebtBalanceMutationGuard.EnsureMutable`.
        // Allows `notIncluded` (still owed); rejects source termination on
        // source-linked rows.
        var canUpdateBalance = !rowAnyMutationBlocked
            && (isMonthOnly || sourceActive);

        // Skip this month: included → notIncluded. Source lifecycle does not
        // gate going *out of* `included`.
        var canSkipThisMonth = !rowAnyMutationBlocked
            && includedParticipation;

        // Include this month: notIncluded → included. Requires source (if
        // any) active so the handler does not reject with
        // `SourceLifecycleClosed`.
        var canIncludeThisMonth = !rowAnyMutationBlocked
            && notIncludedParticipation
            && (isMonthOnly || sourceActive);

        // Mark paid off: source-linked, source = active.
        var canMarkPaidOff = !rowAnyMutationBlocked
            && !isMonthOnly
            && sourceActive;

        // Archive: same preconditions as mark paid off.
        var canArchive = canMarkPaidOff;

        // Restore: source-linked, source = archived.
        var canRestore = !rowAnyMutationBlocked
            && !isMonthOnly
            && sourceArchived;

        // Remove: month-only only. Source-linked rows must use archive.
        var canRemove = !rowAnyMutationBlocked
            && isMonthOnly;

        // CanUpdatePlan: signals whether plan-writing scopes are available
        // on this row right now. Must follow the same closed/skipped-month
        // and row-immutability gating as every other action flag — leaving
        // it true on a closed month would let PR 7's scope cards stay
        // enabled even while the underlying edit / balance commands are
        // already disabled, surfacing a control that cannot succeed.
        var canUpdatePlan = !rowAnyMutationBlocked && !isMonthOnly && sourceActive;

        var actions = new DebtRowActionsDto(
            CanEditPayment: canEditPayment,
            CanEditDetails: canEditDetails,
            CanUpdateBalance: canUpdateBalance,
            CanSkipThisMonth: canSkipThisMonth,
            CanIncludeThisMonth: canIncludeThisMonth,
            CanMarkPaidOff: canMarkPaidOff,
            CanArchive: canArchive,
            CanRestore: canRestore,
            CanRemove: canRemove,
            CanUpdatePlan: canUpdatePlan);

        return (actions, reasons);
    }
}
