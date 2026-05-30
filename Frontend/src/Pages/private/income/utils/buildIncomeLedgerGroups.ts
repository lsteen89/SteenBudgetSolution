import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import type {
  IncomeLedgerGroupKey,
  IncomeLedgerGroupVm,
  IncomeLedgerRowSourceKind,
  IncomeLedgerRowState,
  IncomeLedgerRowVm,
} from "../types/incomeEditor.types";

/**
 * Group order is locked by the designer handover: `Lön` first (the user's
 * dominant income), then `Hushållsinkomst`, then `Sidoinkomst`. Salary always
 * renders, even when there is no salary row yet (an empty-state placeholder
 * communicates "no salary planned yet" without inventing a row).
 */
const GROUP_ORDER: ReadonlyArray<IncomeLedgerGroupKey> = [
  "salary",
  "householdMember",
  "sideHustle",
];

function deriveRowState(row: {
  isActive: boolean;
}): IncomeLedgerRowState {
  return row.isActive ? "active" : "inactive";
}

/**
 * Decide whether a plan-linked income row differs from its source plan row.
 *
 * Honest comparison rules (designer handover + PR 6):
 *
 *   - Month-only rows never compare (`sourceIncomeItemId == null`). The pill
 *     is reserved for rows that the user genuinely diverged from a planned
 *     value; a month-only row has nothing to diverge from.
 *   - Rows whose source fields the backend could not resolve (i.e. all three
 *     source fields are null) are treated as "no comparison available"
 *     rather than "changed". Faking a delta against missing data is exactly
 *     what the handover bans.
 *   - Amount diffs use a tiny epsilon. The backend stores `decimal(18,2)`,
 *     so amounts round-trip cleanly, but the frontend reads them as
 *     JavaScript numbers (which can carry sub-cent FP noise after string
 *     parsing). 0.005 = half a cent — small enough that any real edit
 *     trips it, large enough to ignore representation drift.
 *   - Name diffs only count when *both* sides are non-null, non-empty
 *     strings. Salary's `sourceName` is always null (the salary plan row
 *     has no name column), so the name path silently no-ops for salary —
 *     the amount path still works and is the relevant signal there.
 *   - Active diffs only count when both sides are explicit booleans. Salary
 *     is always active on both sides by backend invariant, so the active
 *     path also no-ops for salary.
 */
export function isIncomeRowChangedFromPlan(row: {
  sourceIncomeItemId: string | null;
  name: string;
  amountMonthly: number;
  isActive: boolean;
  sourceName: string | null;
  sourceAmountMonthly: number | null;
  sourceIsActive: boolean | null;
}): boolean {
  if (row.sourceIncomeItemId == null) return false;

  // "No source values at all" → not comparable. We do not invent a delta.
  if (
    row.sourceName == null &&
    row.sourceAmountMonthly == null &&
    row.sourceIsActive == null
  ) {
    return false;
  }

  // Amount diff (epsilon-tolerant, only when the source amount is known).
  if (
    row.sourceAmountMonthly != null &&
    Number.isFinite(row.amountMonthly) &&
    Number.isFinite(row.sourceAmountMonthly) &&
    Math.abs(row.amountMonthly - row.sourceAmountMonthly) > 0.005
  ) {
    return true;
  }

  // Name diff — both sides must be present and non-empty for the diff to
  // count. Salary's source name is intentionally null and must not trip
  // this branch.
  if (
    row.sourceName != null &&
    row.sourceName.length > 0 &&
    row.name.length > 0 &&
    row.name !== row.sourceName
  ) {
    return true;
  }

  // Active-state diff. Salary has both sides locked to true; only side and
  // household rows can meaningfully differ here.
  if (row.sourceIsActive != null && row.isActive !== row.sourceIsActive) {
    return true;
  }

  return false;
}

/**
 * Stable secondary ordering: active first, then inactive. Within each rank we
 * preserve the editor's original order so a re-render doesn't shuffle rows
 * the user just edited. (Backend already returns salary first, then side and
 * household rows in `SortOrder` order — we keep that within each rank.)
 */
function rowOrderRank(row: IncomeLedgerRowVm): number {
  return row.state === "active" ? 0 : 1;
}

type BuildIncomeLedgerGroupsArgs = {
  rows: ReadonlyArray<BudgetMonthIncomeItemEditorRowDto> | null | undefined;
};

/**
 * Build the three-group ledger view-model from the editor wire rows.
 *
 * Filtering rules mirror {@link buildIncomeSummary}:
 *   - deleted rows are dropped entirely (they should not surface in any group)
 *   - inactive rows are kept but moved below active rows and excluded from
 *     {@link IncomeLedgerGroupVm.activeTotal}, matching the backend dashboard
 *     counting rule (`!isDeleted && isActive`).
 *
 * The salary group always exists. The two add-capable groups (household /
 * side income) get `canCreateInGroup: true`; the salary group does not — the
 * backend stores one salary row per budget month, so a "+" affordance on
 * that group would be misleading.
 */
export function buildIncomeLedgerGroups({
  rows,
}: BuildIncomeLedgerGroupsArgs): IncomeLedgerGroupVm[] {
  const safeRows = rows ?? [];

  const vmRows: IncomeLedgerRowVm[] = safeRows
    .filter((row) => !row.isDeleted)
    .map((row) => {
      const state = deriveRowState({ isActive: row.isActive });
      const sourceKind: IncomeLedgerRowSourceKind = row.isMonthOnly
        ? "monthOnly"
        : "planLinked";
      const countsInMonthlyTotal = !row.isDeleted && state === "active";
      // Use the sanitized amount (NaN/Inf collapsed to 0) for the diff so
      // the pill never trips on garbage input from the wire.
      const safeAmount = Number.isFinite(row.amountMonthly)
        ? row.amountMonthly
        : 0;
      const isChangedFromPlan = isIncomeRowChangedFromPlan({
        sourceIncomeItemId: row.sourceIncomeItemId,
        name: row.name,
        amountMonthly: safeAmount,
        isActive: row.isActive,
        sourceName: row.sourceName,
        sourceAmountMonthly: row.sourceAmountMonthly,
        sourceIsActive: row.sourceIsActive,
      });

      return {
        id: row.id,
        sourceIncomeItemId: row.sourceIncomeItemId,
        kind: row.kind,
        name: row.name,
        amountMonthly: safeAmount,
        isActive: row.isActive,
        isDeleted: row.isDeleted,
        isMonthOnly: row.isMonthOnly,
        canUpdateDefault: row.canUpdateDefault,
        group: row.kind,
        state,
        countsInMonthlyTotal,
        sourceKind,
        sourceName: row.sourceName,
        sourceAmountMonthly: row.sourceAmountMonthly,
        sourceIsActive: row.sourceIsActive,
        isChangedFromPlan,
      } satisfies IncomeLedgerRowVm;
    });

  return GROUP_ORDER.map((groupKey) => {
    const groupRows = vmRows.filter((row) => row.group === groupKey);

    const orderedRows = [...groupRows].sort((a, b) => {
      const rankDiff = rowOrderRank(a) - rowOrderRank(b);
      if (rankDiff !== 0) return rankDiff;
      // Preserve the editor's original order within each rank.
      return groupRows.indexOf(a) - groupRows.indexOf(b);
    });

    const activeRows = orderedRows.filter((row) => row.countsInMonthlyTotal);
    const inactiveRows = orderedRows.filter(
      (row) => !row.countsInMonthlyTotal,
    );

    const sumAmounts = (rs: IncomeLedgerRowVm[]) =>
      rs.reduce((sum, row) => sum + row.amountMonthly, 0);

    return {
      key: groupKey,
      rows: orderedRows,
      activeRows,
      inactiveRows,
      activeTotal: sumAmounts(activeRows),
      inactiveTotal: sumAmounts(inactiveRows),
      activeCount: activeRows.length,
      inactiveCount: inactiveRows.length,
      monthOnlyCount: groupRows.filter((row) => row.sourceKind === "monthOnly")
        .length,
      canCreateInGroup: groupKey !== "salary",
    } satisfies IncomeLedgerGroupVm;
  });
}
