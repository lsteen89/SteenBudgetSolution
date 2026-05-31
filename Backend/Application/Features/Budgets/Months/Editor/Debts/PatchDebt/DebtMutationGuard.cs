using Backend.Application.Constants;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.PatchDebt;

/// <summary>
/// Shared pre-flight guard for Debt planned-payment mutation paths
/// (single-row and bulk). PR 1.5 introduces this helper so the two
/// handlers cannot drift on which lifecycle / participation states
/// reject mutation. Order of checks is the source of truth for which
/// precise error code wins when a row is in more than one
/// non-mutable state.
/// </summary>
internal static class DebtMutationGuard
{
    /// <summary>
    /// Returns <see cref="Result.Success"/> when <paramref name="existing"/>
    /// is in a state that accepts planned-payment mutation, otherwise a
    /// <see cref="Result.Failure(Error)"/> with the most precise reason code.
    /// </summary>
    /// <remarks>
    /// Ordering matters:
    /// <list type="number">
    /// <item><c>ParticipationStatus = 'removed'</c> is checked before the
    /// legacy <c>IsDeleted</c> flag so callers get the precise removed-row
    /// reason code even when both flags are set (a row migrated to
    /// <c>removed</c> also sets <c>IsDeleted = 1</c> for backward
    /// compatibility).</item>
    /// <item><c>IsDeleted</c> covers legacy soft-deleted rows that pre-date
    /// the participation column.</item>
    /// <item>The legacy <c>BudgetMonthDebt.Status = 'closed'</c> branch is
    /// retained for safety; current materialization never produces it.</item>
    /// <item><c>ParticipationStatus = 'notIncluded'</c> requires explicit
    /// re-inclusion (PR 4) before planned payment can be edited.</item>
    /// <item>Source lifecycle terminations (<c>paidOff</c> / <c>archived</c>
    /// / <c>deleted</c>) reject all planned-payment mutations on linked rows;
    /// month-only rows (no source) are not affected by this branch.</item>
    /// </list>
    /// </remarks>
    public static Result EnsureMutable(BudgetMonthDebtMutationReadModel existing)
    {
        if (string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Removed,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure(BudgetMonthDebtErrors.RowRemoved);
        }

        if (existing.IsDeleted)
            return Result.Failure(BudgetMonthDebtErrors.RowDeleted);

        if (string.Equals(existing.Status, "closed", StringComparison.OrdinalIgnoreCase))
            return Result.Failure(BudgetMonthDebtErrors.RowClosed);

        if (!string.Equals(
                existing.ParticipationStatus,
                BudgetMonthDebtParticipationStatuses.Included,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure(BudgetMonthDebtErrors.RowNotIncluded);
        }

        if (existing.SourceDebtId is not null &&
            existing.SourceLifecycleStatus is not null &&
            !string.Equals(
                existing.SourceLifecycleStatus,
                DebtSourceLifecycleStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure(BudgetMonthDebtErrors.SourceLifecycleClosed);
        }

        return Result.Success();
    }
}
