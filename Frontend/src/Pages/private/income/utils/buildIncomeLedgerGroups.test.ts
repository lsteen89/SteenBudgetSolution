import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { describe, expect, it } from "vitest";

import { buildIncomeLedgerGroups } from "./buildIncomeLedgerGroups";

function row(
  overrides: Partial<BudgetMonthIncomeItemEditorRowDto> = {},
): BudgetMonthIncomeItemEditorRowDto {
  return {
    id: overrides.id ?? "row-" + Math.random().toString(36).slice(2, 8),
    sourceIncomeItemId: overrides.sourceIncomeItemId ?? null,
    kind: overrides.kind ?? "sideHustle",
    name: overrides.name ?? "Row",
    amountMonthly: overrides.amountMonthly ?? 0,
    isActive: overrides.isActive ?? true,
    isDeleted: overrides.isDeleted ?? false,
    isMonthOnly: overrides.isMonthOnly ?? false,
    canUpdateDefault: overrides.canUpdateDefault ?? false,
  };
}

describe("buildIncomeLedgerGroups", () => {
  it("returns three groups in locked order, even when there are no rows", () => {
    const groups = buildIncomeLedgerGroups({ rows: [] });

    expect(groups.map((g) => g.key)).toEqual([
      "salary",
      "householdMember",
      "sideHustle",
    ]);
    expect(groups.every((g) => g.activeRows.length === 0)).toBe(true);
    expect(groups.every((g) => g.activeTotal === 0)).toBe(true);
  });

  it("handles a nullish row list without throwing", () => {
    expect(() => buildIncomeLedgerGroups({ rows: null })).not.toThrow();
    expect(() => buildIncomeLedgerGroups({ rows: undefined })).not.toThrow();

    const groups = buildIncomeLedgerGroups({ rows: null });
    expect(groups).toHaveLength(3);
  });

  it("partitions rows by kind into the matching group", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({
          id: "salary-1",
          kind: "salary",
          name: "Net salary",
          amountMonthly: 30000,
        }),
        row({
          id: "house-1",
          kind: "householdMember",
          name: "Partner",
          amountMonthly: 12000,
        }),
        row({
          id: "side-1",
          kind: "sideHustle",
          name: "Consulting",
          amountMonthly: 2500,
        }),
        row({
          id: "side-2",
          kind: "sideHustle",
          name: "Tutoring",
          amountMonthly: 1500,
        }),
      ],
    });

    const [salary, household, side] = groups;
    expect(salary.activeRows.map((r) => r.id)).toEqual(["salary-1"]);
    expect(household.activeRows.map((r) => r.id)).toEqual(["house-1"]);
    expect(side.activeRows.map((r) => r.id)).toEqual(["side-1", "side-2"]);
  });

  it("excludes deleted rows from every group", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({
          kind: "sideHustle",
          name: "kept",
          amountMonthly: 1000,
        }),
        row({
          kind: "sideHustle",
          name: "deleted",
          amountMonthly: 9999,
          isDeleted: true,
        }),
      ],
    });

    const side = groups.find((g) => g.key === "sideHustle")!;
    expect(side.rows.map((r) => r.name)).toEqual(["kept"]);
    expect(side.activeTotal).toBe(1000);
    expect(side.inactiveCount).toBe(0);
  });

  it("keeps inactive rows visible but moves them after active rows and excludes them from the active total", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({
          id: "first",
          kind: "sideHustle",
          name: "Inactive first",
          amountMonthly: 500,
          isActive: false,
        }),
        row({
          id: "second",
          kind: "sideHustle",
          name: "Active second",
          amountMonthly: 1500,
        }),
      ],
    });

    const side = groups.find((g) => g.key === "sideHustle")!;
    expect(side.rows.map((r) => r.id)).toEqual(["second", "first"]);
    expect(side.activeRows.map((r) => r.id)).toEqual(["second"]);
    expect(side.inactiveRows.map((r) => r.id)).toEqual(["first"]);
    expect(side.activeTotal).toBe(1500);
    expect(side.inactiveTotal).toBe(500);
    expect(side.activeCount).toBe(1);
    expect(side.inactiveCount).toBe(1);
  });

  it("preserves the editor order within the active and inactive ranks", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({ id: "a", kind: "sideHustle", isActive: true }),
        row({ id: "b", kind: "sideHustle", isActive: false }),
        row({ id: "c", kind: "sideHustle", isActive: true }),
        row({ id: "d", kind: "sideHustle", isActive: false }),
      ],
    });

    const side = groups.find((g) => g.key === "sideHustle")!;
    // Active in editor order, then inactive in editor order.
    expect(side.rows.map((r) => r.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("derives sourceKind from isMonthOnly and counts month-only rows per group", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({
          kind: "sideHustle",
          name: "linked",
          sourceIncomeItemId: "src-1",
          isMonthOnly: false,
        }),
        row({
          kind: "sideHustle",
          name: "month-only",
          sourceIncomeItemId: null,
          isMonthOnly: true,
        }),
      ],
    });

    const side = groups.find((g) => g.key === "sideHustle")!;
    expect(side.rows[0].sourceKind).toBe("planLinked");
    expect(side.rows[1].sourceKind).toBe("monthOnly");
    expect(side.monthOnlyCount).toBe(1);
  });

  it("only enables canCreateInGroup on the household and side-income groups", () => {
    const groups = buildIncomeLedgerGroups({ rows: [] });

    const byKey = Object.fromEntries(groups.map((g) => [g.key, g] as const));
    expect(byKey.salary.canCreateInGroup).toBe(false);
    expect(byKey.householdMember.canCreateInGroup).toBe(true);
    expect(byKey.sideHustle.canCreateInGroup).toBe(true);
  });

  it("treats non-finite amounts as zero so the totals stay reconcilable", () => {
    const groups = buildIncomeLedgerGroups({
      rows: [
        row({
          kind: "sideHustle",
          amountMonthly: Number.NaN,
        }),
        row({
          kind: "sideHustle",
          amountMonthly: Number.POSITIVE_INFINITY,
        }),
        row({
          kind: "sideHustle",
          amountMonthly: 1500,
        }),
      ],
    });

    const side = groups.find((g) => g.key === "sideHustle")!;
    expect(side.activeTotal).toBe(1500);
  });
});
