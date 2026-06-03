import { describe, expect, it } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import { DEBT_GROUP_ORDER, groupDebtRows } from "./debtEditorGroups";
import { emptyPaymentBreakdown } from "../__fixtures__/paymentBreakdown";

const baseRow = (overrides: Partial<DebtEditorRowDto>): DebtEditorRowDto => ({
  id: "row",
  sourceDebtId: null,
  name: "Test",
  type: "bank_loan",
  balance: 1000,
  sourceBalance: null,
  apr: 0,
  sourceApr: null,
  monthlyFee: null,
  sourceMonthlyFee: null,
  minPayment: null,
  sourceMinPayment: null,
  termMonths: null,
  sourceTermMonths: null,
  monthlyPayment: 100,
  sourceMonthlyPayment: null,
  sourceLifecycleStatus: "active",
  participationStatus: "included",
  isMonthOnly: true,
  isRemoved: false,
  sortOrder: 0,
  group: "active",
  progress: null,
  paymentBreakdown: emptyPaymentBreakdown,
  actions: {
    canEditPayment: true,
    canEditDetails: true,
    canUpdateBalance: true,
    canSkipThisMonth: true,
    canIncludeThisMonth: false,
    canMarkPaidOff: false,
    canArchive: false,
    canRestore: false,
    canRemove: true,
    canUpdatePlan: false,
  },
  disabledReasons: [],
  ...overrides,
});

describe("groupDebtRows", () => {
  it("buckets rows by the backend-provided `group` field", () => {
    const grouped = groupDebtRows([
      baseRow({ id: "a", group: "active" }),
      baseRow({ id: "s", group: "skipped" }),
      baseRow({ id: "p", group: "paid" }),
      baseRow({ id: "x", group: "archived" }),
    ]);
    expect(grouped.active.map((r) => r.id)).toEqual(["a"]);
    expect(grouped.skipped.map((r) => r.id)).toEqual(["s"]);
    expect(grouped.paid.map((r) => r.id)).toEqual(["p"]);
    expect(grouped.archived.map((r) => r.id)).toEqual(["x"]);
  });

  it("sorts each bucket by `sortOrder` ascending", () => {
    const grouped = groupDebtRows([
      baseRow({ id: "a3", group: "active", sortOrder: 3 }),
      baseRow({ id: "a1", group: "active", sortOrder: 1 }),
      baseRow({ id: "a2", group: "active", sortOrder: 2 }),
    ]);
    expect(grouped.active.map((r) => r.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("never infers group from zero payment or zero balance", () => {
    // A zero monthlyPayment must remain in `active` if the backend said so —
    // never silently moved into `skipped`. Likewise, a zero balance stays
    // wherever its `group` puts it.
    const grouped = groupDebtRows([
      baseRow({ id: "zp", group: "active", monthlyPayment: 0 }),
      baseRow({ id: "zb", group: "active", balance: 0 }),
    ]);
    expect(grouped.active.map((r) => r.id).sort()).toEqual(["zb", "zp"]);
    expect(grouped.skipped).toHaveLength(0);
    expect(grouped.paid).toHaveLength(0);
  });
});

describe("DEBT_GROUP_ORDER", () => {
  it("renders groups in the design's reading order", () => {
    expect(DEBT_GROUP_ORDER.map((g) => g.group)).toEqual([
      "active",
      "skipped",
      "paid",
      "archived",
    ]);
  });
});
