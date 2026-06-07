import { describe, expect, it } from "vitest";

import type {
  DashboardPeriodHeaderSummary,
  DashboardSummary,
  HeaderLifecycleState,
  RecurringExpenseSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

import {
  MAX_ATTENTION_ITEMS,
  rankAttentionItems,
  type AttentionItem,
} from "./attentionRanking";

function buildHeader(
  overrides: Partial<DashboardPeriodHeaderSummary> = {},
): DashboardPeriodHeaderSummary {
  return {
    periodKey: "2026-06",
    periodLabel: "June 2026",
    periodDateRangeLabel: "1 Jun – 30 Jun",
    periodStatus: "open",
    previousPeriodLabel: null,
    nextPeriodLabel: null,
    previousPeriodKey: null,
    nextPeriodKey: null,
    canGoPrevious: false,
    canGoNext: false,
    canCloseMonth: false,
    closeMonthButtonLabel: null,
    lifecycleState: "normal",
    noticeText: null,
    closeEligibleAt: null,
    closeWindowOpensAt: null,
    ...overrides,
  };
}

function buildSummary(
  overrides: {
    header?: Partial<DashboardPeriodHeaderSummary>;
    finalBalance?: number;
    totalIncome?: number;
    totalSavings?: number;
    totalDebtPayments?: number;
    subscriptionsTotal?: number;
    subscriptionsCount?: number;
    recurringExpenses?: RecurringExpenseSummary[];
  } = {},
): DashboardSummary {
  return {
    header: buildHeader(overrides.header),
    remainingToSpend: overrides.finalBalance ?? 5000,
    currency: "SEK",
    emergencyFundAmount: 0,
    emergencyFundMonths: 0,
    goalsProgressPercent: 0,
    totalIncome: overrides.totalIncome ?? 30000,
    totalExpenditure: 18000,
    incomingCarryOverAmount: 0,
    habitSavings: 0,
    goalSavings: 0,
    totalSavings: overrides.totalSavings ?? 5000,
    totalDebtPayments: overrides.totalDebtPayments ?? 0,
    finalBalance: overrides.finalBalance ?? 5000,
    subscriptionsTotal: overrides.subscriptionsTotal ?? 0,
    subscriptionsCount: overrides.subscriptionsCount ?? 0,
    subscriptions: [],
    pillarDescriptions: {
      income: "",
      expenditure: "",
      savings: "",
      debts: "",
    },
    recurringExpenses: overrides.recurringExpenses ?? [],
  };
}

const closeAvailabilityNone: CloseAvailability = { kind: "none" };
const closeAvailabilityCountdown: CloseAvailability = {
  kind: "countdown",
  days: 3,
  label: "Closes in 3 days",
};

function idsOf(items: AttentionItem[]): string[] {
  return items.map((i) => i.id);
}

describe("rankAttentionItems — caps and shape", () => {
  it("returns at most MAX_ATTENTION_ITEMS items", () => {
    // Manufactured pile-up: overdue + deficit + subs + debts + savings light.
    const summary = buildSummary({
      header: { lifecycleState: "overdue", canCloseMonth: true },
      finalBalance: -2000,
      totalSavings: 0,
      totalDebtPayments: 2000,
      subscriptionsTotal: 800,
      subscriptionsCount: 4,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(items.length).toBeLessThanOrEqual(MAX_ATTENTION_ITEMS);
  });

  it("attaches a stable action target to every item", () => {
    const summary = buildSummary({ subscriptionsTotal: 500, subscriptionsCount: 2 });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    for (const item of items) {
      expect(item.action).toBeDefined();
      expect(item.titleKey).toBeTruthy();
      expect(item.bodyKey).toBeTruthy();
      expect(item.actionKey).toBeTruthy();
    }
  });
});

describe("rankAttentionItems — priority order", () => {
  it("ranks overdue close first", () => {
    const summary = buildSummary({
      header: { lifecycleState: "overdue", canCloseMonth: true },
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(items[0]?.id).toBe("overdue-close");
    expect(items[0]?.severity).toBe("critical");
    expect(items[0]?.action).toEqual({ kind: "close-month" });
  });

  it("does not emit overdue-close when canCloseMonth is false (review fix)", () => {
    // Inconsistent backend state: lifecycleState says "overdue" but
    // canCloseMonth is false (the backend refuses to close). The lane
    // must not surface a close-flow CTA the backend will reject.
    const summary = buildSummary({
      header: { lifecycleState: "overdue", canCloseMonth: false },
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(idsOf(items)).not.toContain("overdue-close");
  });

  it("ranks deficit ahead of routine info items", () => {
    const summary = buildSummary({
      finalBalance: -1500,
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
      totalDebtPayments: 1000,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(items[0]?.id).toBe("deficit");
    expect(items[0]?.severity).toBe("critical");
  });

  it("ranks overdue close ahead of deficit when both apply", () => {
    const summary = buildSummary({
      header: { lifecycleState: "overdue", canCloseMonth: true },
      finalBalance: -1500,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(idsOf(items)).toEqual(["overdue-close", "deficit"]);
  });

  it("uses the close countdown only when no other close item is present", () => {
    const eligible = buildSummary({
      header: { lifecycleState: "eligible", canCloseMonth: true },
    });

    const eligibleItems = rankAttentionItems({
      summary: eligible,
      closeAvailability: closeAvailabilityCountdown,
    });

    expect(idsOf(eligibleItems)).toContain("eligible-close");
    expect(idsOf(eligibleItems)).not.toContain("close-countdown");

    const normal = buildSummary({ header: { lifecycleState: "normal" } });
    const normalItems = rankAttentionItems({
      summary: normal,
      closeAvailability: closeAvailabilityCountdown,
    });

    expect(idsOf(normalItems)).toContain("close-countdown");
  });
});

describe("rankAttentionItems — financial signals", () => {
  it("flags missing savings plan when income > 0 and savings are zero", () => {
    const summary = buildSummary({ totalSavings: 0, totalIncome: 25000 });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(idsOf(items)).toContain("no-savings-plan");
    const item = items.find((i) => i.id === "no-savings-plan");
    expect(item?.action).toEqual({
      kind: "open-quick-drawer",
      pillar: "savings",
    });
  });

  it("flags subscriptions pressure when subscriptionsTotal > 0", () => {
    const summary = buildSummary({
      subscriptionsTotal: 1200,
      subscriptionsCount: 5,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    const subs = items.find((i) => i.id === "subscriptions-pressure");
    expect(subs).toBeDefined();
    expect(subs?.action).toEqual({
      kind: "open-quick-drawer",
      pillar: "expenses",
    });
    expect(subs?.values?.count).toBe(5);
  });

  it("flags debt pressure when totalDebtPayments > 0", () => {
    const summary = buildSummary({ totalDebtPayments: 2500 });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    const debt = items.find((i) => i.id === "debt-pressure");
    expect(debt).toBeDefined();
    expect(debt?.action).toEqual({
      kind: "open-quick-drawer",
      pillar: "debts",
    });
  });

  it("flags recurring expenses beyond subscriptions and avoids double counting", () => {
    const recurring: RecurringExpenseSummary[] = [
      {
        id: "1",
        nameKey: "rent",
        nameLabel: "Rent",
        categoryKey: "fixed",
        categoryLabel: "Fixed",
        amountMonthly: 9000,
      },
      {
        id: "2",
        nameKey: "subA",
        nameLabel: "Sub A",
        categoryKey: "subs",
        categoryLabel: "Subscriptions",
        amountMonthly: 99,
      },
      {
        id: "3",
        nameKey: "subB",
        nameLabel: "Sub B",
        categoryKey: "subs",
        categoryLabel: "Subscriptions",
        amountMonthly: 49,
      },
    ];
    const summary = buildSummary({
      recurringExpenses: recurring,
      subscriptionsTotal: 148,
      subscriptionsCount: 2,
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    const recurringItem = items.find((i) => i.id === "recurring-pressure");
    expect(recurringItem).toBeDefined();
    // 3 recurring entries - 2 subscriptions = 1 non-subscription recurring.
    expect(recurringItem?.values?.count).toBe(1);
  });

  it("flags large surplus only when remaining / income >= 0.15", () => {
    const justAbove = buildSummary({
      totalIncome: 20000,
      finalBalance: 3000, // 15% exactly
    });
    const justBelow = buildSummary({
      totalIncome: 20000,
      finalBalance: 2999, // just under 15%
    });

    const above = rankAttentionItems({
      summary: justAbove,
      closeAvailability: closeAvailabilityNone,
    });
    const below = rankAttentionItems({
      summary: justBelow,
      closeAvailability: closeAvailabilityNone,
    });

    expect(idsOf(above)).toContain("large-surplus");
    expect(idsOf(below)).not.toContain("large-surplus");
  });
});

describe("rankAttentionItems — calm and read-only behavior", () => {
  it("returns a single positive 'stable plan' item when nothing else qualifies", () => {
    const summary = buildSummary({
      header: { lifecycleState: "normal" },
      finalBalance: 100, // small positive, no surplus flag
      totalIncome: 30000,
      totalSavings: 5000,
      totalDebtPayments: 0,
      subscriptionsTotal: 0,
      subscriptionsCount: 0,
      recurringExpenses: [],
    });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("stable-plan");
    expect(items[0]?.severity).toBe("positive");
  });

  it("returns no items defensively for closed/skipped months", () => {
    const closed = buildSummary({
      header: { periodStatus: "closed" satisfies "closed" | "open" | "skipped" },
      finalBalance: -1000,
    });
    const skipped = buildSummary({
      header: { periodStatus: "skipped" satisfies "closed" | "open" | "skipped" },
    });

    expect(
      rankAttentionItems({
        summary: closed,
        closeAvailability: closeAvailabilityNone,
      }),
    ).toEqual([]);
    expect(
      rankAttentionItems({
        summary: skipped,
        closeAvailability: closeAvailabilityNone,
      }),
    ).toEqual([]);
  });

  it("does not flag deficit for a rounding-leftover negative", () => {
    const summary = buildSummary({ finalBalance: -0.001 });

    const items = rankAttentionItems({
      summary,
      closeAvailability: closeAvailabilityNone,
    });

    expect(idsOf(items)).not.toContain("deficit");
  });
});

describe("rankAttentionItems — lifecycle states", () => {
  it.each<HeaderLifecycleState>(["normal", "upcoming", "eligible", "overdue"])(
    "produces a result for lifecycle state %s without throwing",
    (state) => {
      const summary = buildSummary({
        header: { lifecycleState: state, canCloseMonth: state === "eligible" || state === "overdue" },
      });
      expect(() =>
        rankAttentionItems({
          summary,
          closeAvailability: closeAvailabilityNone,
        }),
      ).not.toThrow();
    },
  );
});
