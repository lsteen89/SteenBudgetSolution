using Backend.Application.Constants;
using Backend.Application.Features.Budgets.Months.Editor.Models.Debts;
using Backend.Domain.Errors.Budget;
using Backend.Domain.Shared;

namespace Backend.Application.Features.Budgets.Months.Editor.Debts.AdjustBalance;

/// <summary>
/// Pre-flight guard for balance-adjustment mutations. Deliberately separate
/// from the planned-payment / metadata guard (<c>DebtMutationGuard</c>)
/// because the two paths disagree on one row state:
///
/// <list type="bullet">
/// <item><c>DebtMutationGuard</c> rejects <c>ParticipationStatus = 'notIncluded'</c>
/// — planned payment can't move while a debt is skipped this month.</item>
/// <item>This guard <em>allows</em> <c>notIncluded</c> rows — the underlying
/// liability is still owed and the lender can still update its statement,
/// so a balance correction must remain available.</item>
/// </list>
///
/// All other rejection reasons (removed, deleted, legacy closed, month-only
/// + plan-scope, source-lifecycle terminations + plan-scope) are shared with
/// the planned-payment guard and resolve to the same error codes.
/// </summary>
internal static class DebtBalanceMutationGuard
{
    public static Result EnsureMutable(
        BudgetMonthDebtMutationReadModel existing,
        bool writesBudgetPlan)
    {
        // Order matches `DebtMutationGuard.EnsureMutable` so the same row in
        // multiple non-mutable states surfaces the same precise reason code
        // regardless of which write path the FE attempted.
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

        // Intentional gap vs. `DebtMutationGuard`: `notIncluded` rows are
        // accepted here. A skipped debt can still receive a balance
        // correction because the underlying liability did not pause with the
        // month.

        // Source lifecycle termination (paidOff / archived / deleted) is
        // rejected for any scope on a source-linked row. PR 3 spec is
        // explicit: "source lifecycle paidOff/archived/deleted rejected
        // unless a later PR defines an explicit restore/update path." The
        // restrict-then-relax direction is safer — PR 4's restore command
        // can selectively re-open balance writes when it lands. Month-only
        // rows (no `SourceDebtId`) skip this branch entirely.
        if (existing.SourceDebtId is not null &&
            existing.SourceLifecycleStatus is not null &&
            !string.Equals(
                existing.SourceLifecycleStatus,
                DebtSourceLifecycleStatuses.Active,
                StringComparison.OrdinalIgnoreCase))
        {
            return Result.Failure(BudgetMonthDebtErrors.SourceLifecycleClosed);
        }

        // Plan-writing scopes additionally require a real source row.
        // Month-only adjustments are fine in any scope that doesn't write
        // the plan side.
        if (writesBudgetPlan && existing.SourceDebtId is null)
            return Result.Failure(BudgetMonthDebtErrors.CannotUpdatePlanForMonthOnlyRow);

        return Result.Success();
    }
}
