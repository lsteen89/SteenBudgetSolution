import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import StandaloneInsightActionCards from "./StandaloneInsightActionCards";
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

function renderCards(props?: {
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
      <StandaloneInsightActionCards
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

function renderedItemIds(): string[] {
  const list = screen.getByTestId("insight-action-cards-items");
  return within(list)
    .getAllByRole("listitem")
    .map((li) => li.getAttribute("data-testid") ?? "");
}

describe("StandaloneInsightActionCards", () => {
  it("renders at most 3 cards", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "overdue", canCloseMonth: true }),
      finalBalance: -1500,
      totalSavings: 0,
      totalDebtPayments: 2000,
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
    });
    renderCards({ summary });

    const list = screen.getByTestId("insight-action-cards-items");
    expect(Number(list.getAttribute("data-count"))).toBeLessThanOrEqual(3);
    expect(within(list).getAllByRole("listitem").length).toBeLessThanOrEqual(3);
  });

  it("leads with the deficit card for a normal-lifecycle deficit month", () => {
    const summary = buildSummary({
      finalBalance: -1500,
      totalSavings: 0,
      subscriptionsTotal: 500,
      subscriptionsCount: 2,
    });
    renderCards({ summary });

    expect(renderedItemIds()[0]).toBe("attention-item-deficit");
  });

  it("puts overdue close before the deficit card when both apply", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "overdue", canCloseMonth: true }),
      finalBalance: -1500,
    });
    renderCards({ summary });

    const ids = renderedItemIds();
    expect(ids[0]).toBe("attention-item-overdue-close");
    expect(ids[1]).toBe("attention-item-deficit");
  });

  it("leads with the eligible-close card when the close window is open", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "eligible", canCloseMonth: true }),
    });
    renderCards({ summary });

    expect(renderedItemIds()[0]).toBe("attention-item-eligible-close");
  });

  it("surfaces the large-surplus card for a healthy surplus month", () => {
    const summary = buildSummary({
      finalBalance: 6000,
      remainingToSpend: 6000,
      totalIncome: 30000,
    });
    renderCards({ summary });

    const card = screen.getByTestId("attention-item-large-surplus");
    expect(card.getAttribute("data-severity")).toBe("positive");
  });

  it("renders the calm stable-plan card when nothing else qualifies", () => {
    renderCards();
    const card = screen.getByTestId("attention-item-stable-plan");
    expect(card).toBeInTheDocument();
    expect(card.getAttribute("data-severity")).toBe("positive");
    const list = screen.getByTestId("insight-action-cards-items");
    expect(Number(list.getAttribute("data-count"))).toBe(1);
  });

  it("routes the overdue close card to the close-month handler", () => {
    const summary = buildSummary({
      header: buildHeader({ lifecycleState: "overdue", canCloseMonth: true }),
    });
    const { onCloseMonth } = renderCards({ summary });

    fireEvent.click(screen.getByTestId("attention-action-overdue-close"));
    expect(onCloseMonth).toHaveBeenCalledTimes(1);
  });

  it("routes the deficit card to the expenses quick drawer", () => {
    const summary = buildSummary({ finalBalance: -1500 });
    const { onOpenQuickDrawer } = renderCards({ summary });

    fireEvent.click(screen.getByTestId("attention-action-deficit"));
    expect(onOpenQuickDrawer).toHaveBeenCalledWith("expenses");
  });

  it("routes the no-savings card to the savings quick drawer", () => {
    const summary = buildSummary({ totalSavings: 0, totalIncome: 25000 });
    const { onOpenQuickDrawer } = renderCards({ summary });

    fireEvent.click(screen.getByTestId("attention-action-no-savings-plan"));
    expect(onOpenQuickDrawer).toHaveBeenCalledWith("savings");
  });

  it("renders the breakdown action as a router link, not a button handler", () => {
    // The calm/stable state routes to the breakdown page.
    renderCards();
    const link = screen.getByTestId("attention-action-stable-plan");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/dashboard/breakdown");
  });

  it("uses critical severity for the deficit card", () => {
    const summary = buildSummary({ finalBalance: -1500 });
    renderCards({ summary });

    const deficit = screen.getByTestId("attention-item-deficit");
    expect(deficit.getAttribute("data-severity")).toBe("critical");
  });

  it("renders no explanatory framing or 'how chosen' disclosure", () => {
    renderCards();

    // The V2 blueprint replaced the lane's help-system framing with bare cards.
    expect(screen.queryByText("Worth a quick look")).toBeNull();
    expect(screen.queryByText("Attention")).toBeNull();
    expect(screen.queryByText("How these are chosen")).toBeNull();
    expect(screen.queryByTestId("attention-lane-how-chosen")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders nothing for a non-open month", () => {
    const summary = buildSummary({
      header: buildHeader({ periodStatus: "closed" }),
    });
    renderCards({ summary });

    expect(screen.queryByTestId("insight-action-cards")).toBeNull();
  });
});
