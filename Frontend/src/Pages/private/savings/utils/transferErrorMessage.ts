import type { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";

/**
 * Map BE failure envelopes from `POST .../savings-goals/{id}/transfer`
 * to a localized toast string.
 *
 * The thrown value is the `ApiProblem` produced by
 * `unwrapEnvelopeData` — we read `.code` defensively so a non-Problem
 * throw (network strip, JSON parse error) still falls back to the
 * generic message. Error codes are the canonical BE strings from
 * `Backend/Domain/Errors/Budget/Errors.BudgetMonthSavingsGoalErrors.cs`
 * and `Errors.BudgetMonth.cs`.
 *
 * Lives next to the savings page so the page file stays focused on
 * rendering and so the mapping can be unit-tested in isolation without
 * spinning up the full editor harness.
 */
export function transferErrorMessage(
  err: unknown,
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
): string {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code?: unknown }).code === "string"
      ? (err as { code: string }).code
      : null;

  switch (code) {
    case "BudgetMonthSavingsGoal.WithdrawalBelowZero":
      return t("transferToastErrorWithdrawTooMuch");
    case "BudgetMonthSavingsGoal.SourcePlanNotFound":
      return t("transferToastErrorSourcePlanMissing");
    case "BudgetMonth.MonthIsClosed":
      return t("transferToastErrorMonthClosed");
    default:
      return t("transferToastError");
  }
}
