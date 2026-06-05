// Stable iteration order for the lifecycle ledger groups, plus the i18n
// dictionary keys each group uses for title / insight / count / total label.
// PR 6 renders groups in this exact order regardless of how the backend orders
// rows, so the page reads top-down: active → not-included → paid → archived.

import type { DebtEditorGroup, DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import type { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";

type Dict = typeof debtsEditorPageDict["sv"];

export type DebtGroupCopy = {
  /** Stable group identifier coming from the backend. */
  group: DebtEditorGroup;
  /** i18n keys used by the group header. */
  titleKey: keyof Dict;
  insightKey: keyof Dict;
  countOneKey: keyof Dict;
  countOtherKey: keyof Dict;
};

/**
 * Group iteration order matches the design's vertical reading order. Archived
 * is the only collapsible group — others are always rendered when they have
 * rows.
 */
export const DEBT_GROUP_ORDER: readonly DebtGroupCopy[] = [
  {
    group: "active",
    titleKey: "groupActiveTitle",
    insightKey: "groupActiveInsight",
    countOneKey: "groupActiveCountOne",
    countOtherKey: "groupActiveCountOther",
  },
  {
    group: "skipped",
    titleKey: "groupSkippedTitle",
    insightKey: "groupSkippedInsight",
    countOneKey: "groupSkippedCountOne",
    countOtherKey: "groupSkippedCountOther",
  },
  {
    group: "paid",
    titleKey: "groupPaidTitle",
    insightKey: "groupPaidInsight",
    countOneKey: "groupPaidCountOne",
    countOtherKey: "groupPaidCountOther",
  },
  {
    group: "archived",
    titleKey: "groupArchivedTitle",
    insightKey: "groupArchivedInsight",
    countOneKey: "groupArchivedCountOne",
    countOtherKey: "groupArchivedCountOther",
  },
] as const;

/**
 * Partition rows into the four lifecycle buckets in a single pass, keeping
 * the backend-provided `sortOrder` within each bucket. The backend already
 * filters `removed` participation and source-deleted rows from the editor
 * read, so anything reaching this helper belongs to one of the four groups.
 */
export function groupDebtRows(
  rows: readonly DebtEditorRowDto[],
): Record<DebtEditorGroup, DebtEditorRowDto[]> {
  const buckets: Record<DebtEditorGroup, DebtEditorRowDto[]> = {
    active: [],
    skipped: [],
    paid: [],
    archived: [],
  };

  for (const row of rows) {
    buckets[row.group].push(row);
  }

  for (const key of Object.keys(buckets) as DebtEditorGroup[]) {
    buckets[key].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return buckets;
}
