import type { BudgetMonthIncomeItemEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { describe, expect, it } from "vitest";

import { buildIncomeSummary } from "./buildIncomeSummary";

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
    sourceName: overrides.sourceName ?? null,
    sourceAmountMonthly: overrides.sourceAmountMonthly ?? null,
    sourceIsActive: overrides.sourceIsActive ?? null,
  };
}

describe("buildIncomeSummary", () => {
  it("returns an all-zero summary when rows are nullish or empty", () => {
    expect(buildIncomeSummary({ rows: null })).toEqual({
      salaryTotal: 0,
      householdTotal: 0,
      sideHustleTotal: 0,
      total: 0,
      salaryActiveCount: 0,
      householdActiveCount: 0,
      sideHustleActiveCount: 0,
      totalActiveCount: 0,
    });
    expect(buildIncomeSummary({ rows: [] })).toMatchObject({
      total: 0,
      totalActiveCount: 0,
    });
  });

  it("splits active rows by kind and sums the per-kind totals", () => {
    const summary = buildIncomeSummary({
      rows: [
        row({ kind: "salary", amountMonthly: 30000 }),
        row({ kind: "householdMember", amountMonthly: 12000 }),
        row({ kind: "householdMember", amountMonthly: 8000 }),
        row({ kind: "sideHustle", amountMonthly: 2500 }),
        row({ kind: "sideHustle", amountMonthly: 1500 }),
      ],
    });

    expect(summary.salaryTotal).toBe(30000);
    expect(summary.householdTotal).toBe(20000);
    expect(summary.sideHustleTotal).toBe(4000);
    expect(summary.salaryActiveCount).toBe(1);
    expect(summary.householdActiveCount).toBe(2);
    expect(summary.sideHustleActiveCount).toBe(2);
    expect(summary.total).toBe(54000);
    expect(summary.totalActiveCount).toBe(5);
  });

  it("excludes deleted rows from totals and counts", () => {
    const summary = buildIncomeSummary({
      rows: [
        row({ kind: "salary", amountMonthly: 30000 }),
        row({ kind: "sideHustle", amountMonthly: 5000, isDeleted: true }),
      ],
    });

    expect(summary.sideHustleTotal).toBe(0);
    expect(summary.sideHustleActiveCount).toBe(0);
    expect(summary.total).toBe(30000);
    expect(summary.totalActiveCount).toBe(1);
  });

  it("excludes inactive rows so the total matches the dashboard total", () => {
    const summary = buildIncomeSummary({
      rows: [
        row({ kind: "salary", amountMonthly: 30000 }),
        row({
          kind: "householdMember",
          amountMonthly: 10000,
          isActive: false,
        }),
      ],
    });

    expect(summary.householdTotal).toBe(0);
    expect(summary.householdActiveCount).toBe(0);
    expect(summary.total).toBe(30000);
  });

  it("treats non-finite amounts as zero rather than NaN-polluting the total", () => {
    const summary = buildIncomeSummary({
      rows: [
        row({ kind: "salary", amountMonthly: Number.NaN }),
        row({ kind: "sideHustle", amountMonthly: Infinity }),
        row({ kind: "householdMember", amountMonthly: 5000 }),
      ],
    });

    expect(summary.salaryTotal).toBe(0);
    expect(summary.sideHustleTotal).toBe(0);
    expect(summary.householdTotal).toBe(5000);
    expect(summary.total).toBe(5000);
  });
});
