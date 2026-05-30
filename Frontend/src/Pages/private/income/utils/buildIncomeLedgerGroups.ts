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

      return {
        id: row.id,
        sourceIncomeItemId: row.sourceIncomeItemId,
        kind: row.kind,
        name: row.name,
        amountMonthly: Number.isFinite(row.amountMonthly)
          ? row.amountMonthly
          : 0,
        isActive: row.isActive,
        isDeleted: row.isDeleted,
        isMonthOnly: row.isMonthOnly,
        canUpdateDefault: row.canUpdateDefault,
        group: row.kind,
        state,
        countsInMonthlyTotal,
        sourceKind,
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
