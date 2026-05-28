import type { savingsGoalRenameModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalRenameModal.i18n";
import type { savingsGoalTargetAmountModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalTargetAmountModal.i18n";

/**
 * V2 PR-10 — map BE failure envelopes from the rename + target-amount
 * endpoints to a localized toast string.
 *
 * The thrown value is the `ApiProblem` produced by
 * `unwrapEnvelopeData`; we read `.code` defensively so a non-Problem
 * throw (network strip, JSON parse error, generic Error) still falls
 * back to the modal's generic toast. Error codes are the canonical BE
 * strings from `Errors.BudgetMonthSavingsGoalErrors.cs` and
 * `Errors.BudgetMonth.cs`.
 *
 * Two small helpers (one per modal) instead of a shared switch because
 * the dictionaries are different and TypeScript's `keyof` would force
 * us to widen the dict argument; the duplication is mechanical and
 * keeps each modal's i18n surface honest about what codes it handles.
 */

function readErrorCode(err: unknown): string | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
  ) {
    return (err as { code: string }).code;
  }
  return null;
}

export function renameErrorMessage(
  err: unknown,
  t: <K extends keyof typeof savingsGoalRenameModalDict.sv>(key: K) => string,
): string {
  // All terminal codes the rename handler can return route to a
  // "retry won't help" string instead of the generic "Try again"
  // toast. See `RenameBudgetMonthSavingsGoalCommandHandler` for the
  // exhaustive list — every Failure path is covered here. Unknown
  // codes (network strip, parse error) still fall back to the
  // generic toast.
  const code = readErrorCode(err);
  switch (code) {
    case "BudgetMonth.MonthIsClosed":
      return t("toastErrorMonthClosed");
    case "BudgetMonthSavingsGoal.SourcePlanNotFound":
      return t("toastErrorSourcePlanMissing");
    case "BudgetMonthSavingsGoal.NotFound":
    case "BudgetMonthSavingsGoal.RowDeleted":
    case "BudgetMonthSavingsGoal.RowClosed":
      return t("toastErrorRowGone");
    default:
      return t("toastError");
  }
}

export function targetAmountErrorMessage(
  err: unknown,
  t: <K extends keyof typeof savingsGoalTargetAmountModalDict.sv>(
    key: K,
  ) => string,
): string {
  const code = readErrorCode(err);
  switch (code) {
    case "BudgetMonthSavingsGoal.TargetBelowSaved":
      return t("toastErrorTargetBelowSaved");
    case "BudgetMonth.MonthIsClosed":
      return t("toastErrorMonthClosed");
    default:
      return t("toastError");
  }
}
