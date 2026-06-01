// Map backend `DebtEditorDisabledReason` codes to the localised reason
// string the FE renders in tooltips / disabled-action copy. The mapping is
// total — every code surfaced by the backend must have a key — and tests
// enforce that. New backend codes therefore force a dictionary update before
// they can ship.

import type { DebtEditorDisabledReason } from "@/types/budget/DebtEditorDto";
import type { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";

type Dict = typeof debtsEditorPageDict["sv"];

const REASON_KEY_MAP: Record<DebtEditorDisabledReason, keyof Dict> = {
  monthClosed: "reasonMonthClosed",
  monthSkipped: "reasonMonthSkipped",
  rowRemoved: "reasonRowRemoved",
  rowDeleted: "reasonRowDeleted",
  rowClosed: "reasonRowClosed",
  monthOnlyNoPlan: "reasonMonthOnlyNoPlan",
  sourceMissing: "reasonSourceMissing",
  sourcePaidOff: "reasonSourcePaidOff",
  sourceArchived: "reasonSourceArchived",
  sourceDeleted: "reasonSourceDeleted",
  alreadyIncluded: "reasonAlreadyIncluded",
  alreadyNotIncluded: "reasonAlreadyNotIncluded",
  sourceLinkedHistoryExists: "reasonSourceLinkedHistoryExists",
};

/**
 * Looks up the i18n dictionary key for a backend reason code. Returns `null`
 * for an unknown code (forward-compatibility with a future backend version
 * that surfaces a code the FE has not been updated for yet); callers should
 * fall back to a generic disabled label in that case.
 */
export function reasonKeyFor(
  reason: DebtEditorDisabledReason,
): keyof Dict | null {
  return REASON_KEY_MAP[reason] ?? null;
}

/**
 * Pick the most descriptive reason to surface as the primary disabled-action
 * tooltip. Month-level blockers come first because they hide *every* action;
 * row-shape and source-lifecycle codes come last because they explain only
 * specific actions.
 */
const REASON_PRIORITY: DebtEditorDisabledReason[] = [
  "monthClosed",
  "monthSkipped",
  "rowDeleted",
  "rowRemoved",
  "rowClosed",
  "sourceDeleted",
  "sourcePaidOff",
  "sourceArchived",
  "sourceMissing",
  "monthOnlyNoPlan",
  "sourceLinkedHistoryExists",
  "alreadyIncluded",
  "alreadyNotIncluded",
];

export function primaryReason(
  reasons: readonly DebtEditorDisabledReason[],
): DebtEditorDisabledReason | null {
  if (reasons.length === 0) return null;
  const set = new Set(reasons);
  for (const code of REASON_PRIORITY) {
    if (set.has(code)) return code;
  }
  return reasons[0];
}
