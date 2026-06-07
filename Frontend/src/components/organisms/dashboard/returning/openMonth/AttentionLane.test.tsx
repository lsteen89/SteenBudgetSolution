import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import AttentionLane from "./AttentionLane";
import type {
  DashboardPeriodHeaderSummary,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

// Force a stable English locale so copy assertions stay deterministic.
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

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

function buildSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  // Default: a balanced "stable plan" — no surplus, no deficit, no follow-ups.
  return {
    header: buildHeader(),
    remainingToSpend: 200,
    currency: "SEK",
    emergencyFundAmount: 0,
    emergencyFundMonths: 0,
    goalsProgressPercent: 0,
    totalIncome: 30000,
    totalExpenditure: 18000,
    incomingCarryOverAmount: 0,
    habitSavings: 0,
    goalSavings: 0,
    totalSavings: 5000,
    totalDebtPayments: 0,
    finalBalance: 200,
    subscriptionsTotal: 0,
    subscriptionsCount: 0,
    subscriptions: [],
    pillarDescriptions: {
      income: "",
      expenditure: "",
      savings: "",
      debts: "",
    },
    recurringExpenses: [],
    ...overrides,
  };
}

const closeAvailabilityNone: CloseAvailability = { kind: "none" };

function renderLane(props?: {
  summary?: DashboardSummary;
  closeAvailability?: CloseAvailability;
  onCloseMonth?: () => void;
  onOpenQuickDrawer?: (pillar: string) => void;
  onOpenFullEditor?: (pillar: string) => void;
}) {
  const onCloseMonth = props?.onCloseMonth ?? vi.fn();
  const onOpenQuickDrawer = props?.onOpenQuickDrawer ?? vi.fn();
  const onOpenFullEditor = props?.onOpenFullEditor ?? vi.fn();

  render(
    <MemoryRouter>
      <AttentionLane
        summary={props?.summary ?? buildSummary()}
        closeAvailability={props?.closeAvailability ?? closeAvailabilityNone}
        onCloseMonth={onCloseMonth}
        onOpenQuickDrawer={onOpenQuickDrawer as (p: any) => void}
        onOpenFullEditor={onOpenFullEditor as (p: any) => void}
      />
    </MemoryRouter>,
  );

  return { onCloseMonth, onOpenQuickDrawer, onOpenFullEditor };
}

describe("AttentionLane", () => {
  it("renders at most 3 items", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "overdue", canCloseMonth: true }),
      finalBalance: -1500,
      totalSavings: 0,
      totalDebtPayments: 2000,
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
    });
    renderLane({ summary });

    const list = screen.getByTestId("attention-lane-items");
    expect(Number(list.getAttribute("data-count"))).toBeLessThanOrEqual(3);
    expect(within(list).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
  });

  it("renders the calm stable-plan card when nothing else qualifies", () => {
    renderLane();
    const card = screen.getByTestId("attention-item-stable-plan");
    expect(card).toBeInTheDocument();
    expect(card.getAttribute("data-severity")).toBe("positive");
    // Only the stable-plan item should be present in this calm state.
    const list = screen.getByTestId("attention-lane-items");
    expect(Number(list.getAttribute("data-count"))).toBe(1);
  });

  it("routes the overdue close item to the close-month handler", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "overdue", canCloseMonth: true }),
    });
    const { onCloseMonth } = renderLane({ summary });

    fireEvent.click(screen.getByTestId("attention-action-overdue-close"));
    expect(onCloseMonth).toHaveBeenCalledTimes(1);
  });

  it("routes the deficit item to the expenses quick drawer", () => {
    const summary = buildSummary({ finalBalance: -1500 });
    const { onOpenQuickDrawer } = renderLane({ summary });

    fireEvent.click(screen.getByTestId("attention-action-deficit"));
    expect(onOpenQuickDrawer).toHaveBeenCalledWith("expenses");
  });

  it("routes the no-savings item to the savings quick drawer", () => {
    const summary = buildSummary({ totalSavings: 0, totalIncome: 25000 });
    const { onOpenQuickDrawer } = renderLane({ summary });

    fireEvent.click(screen.getByTestId("attention-action-no-savings-plan"));
    expect(onOpenQuickDrawer).toHaveBeenCalledWith("savings");
  });

  it("exposes the 'How these are chosen' disclosure with on-device wording", () => {
    renderLane();
    const disclosure = screen.getByTestId("attention-lane-how-chosen");
    expect(disclosure).toBeInTheDocument();
    // The disclosure body must clearly say it's on-device, not backend advice.
    expect(disclosure.textContent ?? "").toMatch(/on-device/i);
    expect(disclosure.textContent ?? "").toMatch(/not backend advice/i);
  });

  it("uses critical severity for the deficit item", () => {
    const summary = buildSummary({ finalBalance: -1500 });
    renderLane({ summary });

    const deficit = screen.getByTestId("attention-item-deficit");
    expect(deficit.getAttribute("data-severity")).toBe("critical");
  });

  it("renders the breakdown link as a router link, not a button handler", () => {
    // Force the lane into the calm/stable state which routes to breakdown.
    renderLane();
    const link = screen.getByTestId("attention-action-stable-plan");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/dashboard/breakdown");
  });
});
