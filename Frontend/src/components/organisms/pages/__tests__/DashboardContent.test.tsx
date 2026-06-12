import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardContent from "../DashboardContent";

const mockUseDashboardSummary = vi.fn();
const mockUseBudgetMonthRecapQuery = vi.fn();
const mockMutateAsync = vi.fn();
const mockSetSelectedYearMonth = vi.fn();
// Controllable next-month preview query. Defaults to "unavailable" (set in
// beforeEach) so the rail Next button keeps its persisted-only behaviour; the
// preview-aware-Next tests (PR4) override it per case.
const mockUseNextMonthPreviewQuery = vi.fn();
// Spy variant of the savings-goal completion candidates query. The default
// implementation matches the previous always-empty mock so existing tests
// keep their behaviour; the gating test (P6) overrides nothing — it only
// asserts on the recorded call arguments.
const mockUseSavingsGoalCompletionCandidatesQuery = vi.fn(
  (_yearMonth?: string | null, _options?: { enabled?: boolean }) => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
  }),
);
let mockAppLocale = "en-US";
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  dismiss: vi.fn(),
  clear: vi.fn(),
  showToast: vi.fn(),
};

vi.mock("@/hooks/dashboard/useDashboardSummary", () => ({
  useDashboardSummary: (...args: unknown[]) => mockUseDashboardSummary(...args),
}));

vi.mock("@/hooks/budget/useBudgetMonthRecapQuery", () => ({
  useBudgetMonthRecapQuery: (...args: unknown[]) =>
    mockUseBudgetMonthRecapQuery(...args),
}));

vi.mock("@/hooks/budget/useCloseBudgetMonthMutation", () => ({
  useCloseBudgetMonthMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/hooks/budget/useSavingsGoalCompletionCandidatesQuery", () => ({
  useSavingsGoalCompletionCandidatesQuery: (
    yearMonth?: string | null,
    options?: { enabled?: boolean },
  ) => mockUseSavingsGoalCompletionCandidatesQuery(yearMonth, options),
  savingsGoalCompletionCandidatesQueryKey: (ym?: string | null) => [
    "savingsGoalCompletionCandidates",
    ym ?? null,
  ],
}));

// PlanningRow (PR3) and the preview-aware MonthRail Next button (PR4) both read
// the next-month preview through this hook. Route it through a controllable spy
// so tests stay off react-query; the shared query key means both consumers get
// one fetch in the real app.
vi.mock("@/hooks/budget/useNextMonthPreviewQuery", () => ({
  useNextMonthPreviewQuery: (...args: unknown[]) =>
    mockUseNextMonthPreviewQuery(...args),
  nextMonthPreviewQueryKey: (ym: string | null) => [
    "nextMonthPreview",
    ym ?? null,
  ],
}));

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => mockAppLocale,
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/stores/Budget/budgetMonthStore", () => ({
  useBudgetMonthStore: (
    selector: (state: {
      selectedYearMonth: string | null;
      setSelectedYearMonth: (value: string | null) => void;
      snoozeUntil: number | null;
      snooze24h: () => void;
      isSnoozed: () => boolean;
    }) => unknown,
  ) =>
    selector({
      selectedYearMonth: "2026-04",
      setSelectedYearMonth: mockSetSelectedYearMonth,
      snoozeUntil: null,
      snooze24h: vi.fn(),
      isSnoozed: () => false,
    }),
}));

vi.mock("@/components/organisms/dashboard/editPeriod/EditPeriodDrawer", () => ({
  default: ({ open, panel }: { open: boolean; panel?: string }) =>
    open ? <div>Edit drawer open: {panel ?? "expenses"}</div> : null,
}));

function buildSummary(
  remainingToSpend: number,
  status: "open" | "closed" | "skipped" = "open",
  options: {
    incomingCarryOverAmount?: number;
    header?: Record<string, unknown>;
    summary?: Record<string, unknown>;
  } = {},
) {
  const base = {
    header: {
      periodKey: "2026-04",
      periodLabel: "April 2026",
      periodDateRangeLabel: "",
      periodStatus: status,
      previousPeriodLabel: "March 2026",
      nextPeriodLabel: null,
      canGoPrevious: true,
      canGoNext: false,
      canCloseMonth: true,
      closeMonthButtonLabel: "Close Month",
      lifecycleState: "eligible" as const,
      noticeText: "This month is ready for review and close.",
      closeEligibleAt: "2026-04-25T00:00:00Z",
      closeWindowOpensAt: "2026-04-22T00:00:00Z",
    },
    remainingToSpend,
    currency: "SEK" as const,
    emergencyFundAmount: 0,
    emergencyFundMonths: 0,
    goalsProgressPercent: 0,
    totalIncome: 12000,
    totalExpenditure: 8000,
    incomingCarryOverAmount: options.incomingCarryOverAmount ?? 0,
    habitSavings: 500,
    goalSavings: 250,
    totalSavings: 750,
    totalDebtPayments: 0,
    finalBalance: remainingToSpend,
    subscriptionsTotal: 0,
    subscriptionsCount: 0,
    subscriptions: [],
    pillarDescriptions: {
      income: "Income is planned for this month.",
      expenditure: "Housing, food and transport",
      savings: "2 savings goals",
      debts: "No active debt balance",
    },
    recurringExpenses: [],
  };

  return {
    ...base,
    ...options.summary,
    header: {
      ...base.header,
      ...options.header,
    },
    pillarDescriptions: {
      ...base.pillarDescriptions,
      ...((options.summary?.pillarDescriptions as Record<string, string>) ??
        {}),
    },
  };
}

/**
 * Build a minimal `BudgetDashboardMonthDto` that satisfies `buildDashboardTerms`
 * so MoneyState can render without throwing. Numbers are internally
 * reconciling (income - expenses - savings - debts = finalBalanceWithCarry)
 * — tests that override `summary.finalBalance` may diverge from this DTO,
 * which is intentional: those tests assert on FollowUpStrip / pillar copy
 * driven by `summary`, not on MoneyState content driven by `dashboardMonth`.
 */
function buildDashboardMonthDto(
  finalBalance: number,
  status: "open" | "closed" | "skipped" = "open",
  yearMonth = "2026-04",
) {
  if (status === "skipped") {
    return {
      currencyCode: "SEK" as const,
      month: {
        yearMonth,
        status: "skipped" as const,
        carryOverMode: "none" as const,
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      liveDashboard: null,
      snapshotTotals: null,
    };
  }

  if (status === "closed") {
    return {
      currencyCode: "SEK" as const,
      month: {
        yearMonth,
        status: "closed" as const,
        carryOverMode: "none" as const,
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      liveDashboard: null,
      snapshotTotals: {
        totalIncomeMonthly: 12000,
        totalExpensesMonthly: 11005,
        totalSavingsMonthly: 750,
        totalDebtPaymentsMonthly: 0,
        finalBalanceMonthly: finalBalance,
      },
    };
  }

  const expenses = 12000 - 0 - 750 - 0 - finalBalance; // keep the equation honest
  return {
    currencyCode: "SEK" as const,
    month: {
      yearMonth,
      status: "open" as const,
      carryOverMode: "none" as const,
      carryOverAmount: null,
      isCloseWindowOpen: true,
      closeWindowOpensAtUtc: "2026-04-22T00:00:00Z",
      closeEligibleAtUtc: "2026-04-25T00:00:00Z",
      isOverdueForClose: false,
    },
    liveDashboard: {
      budgetId: "00000000-0000-0000-0000-000000000001",
      income: {
        netSalaryMonthly: 12000,
        incomePaymentDayType: null,
        incomePaymentDay: null,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: 12000,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: {
        totalExpensesMonthly: expenses,
        byCategory: [],
      },
      savings: {
        monthlySavings: 500,
        totalGoalSavingsMonthly: 250,
        totalSavingsMonthly: 750,
        isMonthOnly: false,
        goals: [],
      },
      debt: {
        totalDebtBalance: 0,
        totalMonthlyPayments: 0,
        debts: [],
        repaymentStrategy: null,
      },
      carryOverAmountMonthly: 0,
      disposableAfterExpensesWithCarryMonthly: 12000 - expenses,
      disposableAfterExpensesAndSavingsWithCarryMonthly:
        12000 - expenses - 750,
      finalBalanceWithCarryMonthly: finalBalance,
      recurringExpenses: [],
      subscriptions: {
        totalMonthlyAmount: 0,
        count: 0,
        items: [],
      },
    },
    snapshotTotals: null,
  };
}

const sampleMonthsStatus = {
  openMonthYearMonth: "2026-04",
  currentYearMonth: "2026-04",
  gapMonthsCount: 0,
  months: [
    {
      yearMonth: "2026-02",
      status: "closed" as const,
      openedAt: "2026-02-01T00:00:00Z",
      closedAt: "2026-02-28T20:00:00Z",
    },
    {
      yearMonth: "2026-03",
      status: "closed" as const,
      openedAt: "2026-03-01T00:00:00Z",
      closedAt: "2026-03-31T20:00:00Z",
    },
    {
      yearMonth: "2026-04",
      status: "open" as const,
      openedAt: "2026-04-01T00:00:00Z",
      closedAt: null,
    },
    {
      yearMonth: "2025-12",
      status: "skipped" as const,
      openedAt: "2025-12-01T00:00:00Z",
      closedAt: null,
    },
  ],
  suggestedAction: "none" as const,
};

const readyResult = {
  data: {
    summary: buildSummary(245),
    breakdown: {
      incomeItems: [],
      expenseCategoryItems: [],
      savingsItems: [],
      debtItems: [],
    },
  },
  // MoneyState (P2) reads from the raw open-month DTO so its anchor and
  // AllocationBar stay aligned with backend-authoritative remaining. Tests
  // that override `data.summary` may diverge from this DTO; that is fine —
  // MoneyState is driven by `dashboardMonth`, FollowUpStrip/pillars by
  // `data.summary`.
  dashboardMonth: buildDashboardMonthDto(245, "open"),
  isPending: false,
  isFetching: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
  goToPreviousMonth: vi.fn(),
  goToNextMonth: vi.fn(),
  monthsStatus: sampleMonthsStatus,
};

const pendingResult = {
  data: null,
  isPending: true,
  isFetching: true,
  isError: false,
  error: null,
  refetch: vi.fn(),
  goToPreviousMonth: vi.fn(),
  goToNextMonth: vi.fn(),
};

function emptySubscriptionInsight(hasPreviousComparableMonth = false) {
  return {
    active: [],
    new: [],
    removed: [],
    paused: [],
    cancelled: [],
    hasPreviousComparableMonth,
  };
}

function emptySavingsDetail(hasPreviousComparableMonth = false) {
  return {
    totalSavingsMonthly: 1000,
    activeGoals: [],
    hasPreviousComparableMonth,
  };
}

function emptyDebtDetail(hasPreviousComparableMonth = false) {
  return {
    totalDebtPaymentsMonthly: 500,
    activeDebts: [],
    hasPreviousComparableMonth,
  };
}

function emptyInsightDrivers() {
  return {
    expenseIncreaseDrivers: [],
    largestExpenseIncreaseDriver: null,
  };
}

function noCarryOverOutcome(targetYearMonth: string | null = "2026-05") {
  return {
    mode: "none" as const,
    amount: 0,
    targetYearMonth,
    wasApplied: false,
  };
}

function fullCarryOverOutcome(amount: number, targetYearMonth = "2026-05") {
  return {
    mode: "full" as const,
    amount,
    targetYearMonth,
    wasApplied: true,
  };
}

function buildClosedRecap(overrides = {}) {
  return {
    month: {
      yearMonth: "2026-04",
      status: "closed",
      openedAtUtc: "2026-04-01T08:00:00Z",
      closedAtUtc: "2026-04-30T20:00:00Z",
      carryOverMode: "none",
      carryOverAmount: null,
    },
    snapshotTotals: {
      totalIncomeMonthly: 10000,
      totalExpensesMonthly: 4000,
      totalSavingsMonthly: 1000,
      totalDebtPaymentsMonthly: 500,
      finalBalanceMonthly: 4500,
    },
    comparison: {
      previousComparableYearMonth: "2026-03",
      hasPreviousComparableMonth: true,
      summary: {
        income: { previousValue: 9000, deltaAmount: 1000, deltaPercent: 11.1 },
        expenses: { previousValue: 4500, deltaAmount: -500, deltaPercent: -11.1 },
        savings: { previousValue: 1200, deltaAmount: -200, deltaPercent: -16.7 },
        debtPayments: { previousValue: 400, deltaAmount: 100, deltaPercent: 25 },
        finalBalance: { previousValue: 2900, deltaAmount: 1600, deltaPercent: 55.2 },
      },
    },
    expenseCategories: [],
    subscriptionInsight: emptySubscriptionInsight(true),
    savingsDetail: emptySavingsDetail(true),
    debtDetail: emptyDebtDetail(true),
    insightDrivers: emptyInsightDrivers(),
    carryOverOutcome: noCarryOverOutcome(),
    ...overrides,
  };
}

function mockClosedMonthDashboard(recap = buildClosedRecap()) {
  mockUseDashboardSummary.mockReturnValue({
    ...readyResult,
    data: {
      ...readyResult.data,
      summary: buildSummary(245, "closed"),
    },
  });
  mockUseBudgetMonthRecapQuery.mockReturnValue({
    data: recap,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  });
}

// A real "preview" DTO from the next-preview endpoint. The dashboard reuses the
// open-month live-dashboard shape (non-empty plan) so `selectNextMonthRemaining`
// returns a real number — i.e. a preview is genuinely available.
function buildPreviewDto() {
  return {
    fromYearMonth: "2026-04",
    previewYearMonth: "2026-05",
    state: "preview" as const,
    basis: "budgetPlan" as const,
    currencyCode: "SEK" as const,
    carryOver: {
      mode: "estimatedFull" as const,
      amount: 245,
      source: "currentMonthLiveFinalBalance" as const,
      isFinal: false as const,
    },
    dashboard: buildDashboardMonthDto(245, "open").liveDashboard,
    limitations: [],
  };
}

function renderDashboardContent() {
  render(
    <MemoryRouter>
      <DashboardContent
        isFirstTimeLogin={false}
        isWizardOpen={false}
        setIsWizardOpen={vi.fn()}
      />
    </MemoryRouter>,
  );
}

function renderDashboardContentWithRoutes() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <DashboardContent
              isFirstTimeLogin={false}
              isWizardOpen={false}
              setIsWizardOpen={vi.fn()}
            />
          }
        />
        <Route path="/dashboard/expenses" element={<div>Expenses route</div>} />
        <Route path="/dashboard/income" element={<div>Income route</div>} />
        <Route path="/dashboard/savings" element={<div>Savings route</div>} />
        <Route path="/dashboard/debts" element={<div>Debts route</div>} />
        <Route
          path="/dashboard/next-month"
          element={<div>Next month preview route</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DashboardContent", () => {
  beforeEach(() => {
    mockAppLocale = "en-US";
    vi.stubEnv("DEV", true);
    mockUseDashboardSummary.mockReset();
    mockUseBudgetMonthRecapQuery.mockReset();
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });
    mockMutateAsync.mockReset();
    mockSetSelectedYearMonth.mockReset();
    mockUseNextMonthPreviewQuery.mockReset();
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    });
    mockUseSavingsGoalCompletionCandidatesQuery.mockClear();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
    mockToast.info.mockReset();
    mockToast.dismiss.mockReset();
    mockToast.clear.mockReset();
    mockToast.showToast.mockReset();
  });

  it("renders the Swedish dashboard load error with localized copy and actions", () => {
    const refetch = vi.fn();
    mockAppLocale = "sv-SE";
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
        raw: {
          message: "Network Error",
          url: "/api/budgets/dashboard?yearMonth=2026-04",
          method: "get",
        },
      },
      refetch,
    });

    renderDashboardContent();

    expect(
      screen.getByRole("heading", { name: "Kunde inte ladda din dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Vi fick inte kontakt med servern. Försök igen om en stund.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /försök igen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ladda om sidan/i }),
    ).toBeInTheDocument();
  });

  it("keeps the retry action available", () => {
    const refetch = vi.fn();
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
      },
      refetch,
    });

    renderDashboardContent();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the reload fallback action available", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
      },
    });

    renderDashboardContent();

    expect(
      screen.getByRole("button", { name: /reload page/i }),
    ).toBeInTheDocument();
  });

  it("renders raw dashboard error details in dev mode", () => {
    vi.stubEnv("DEV", true);
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
        raw: {
          message: "Network Error",
          url: "/api/budgets/dashboard?yearMonth=2026-04",
          method: "get",
        },
      },
    });

    renderDashboardContent();

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText(/\/api\/budgets\/dashboard/)).toBeInTheDocument();
    expect(screen.getByText(/Network Error/)).toBeInTheDocument();
  });

  it("does not render raw dashboard error details in production mode", () => {
    vi.stubEnv("DEV", false);
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
        raw: {
          message: "Network Error",
          url: "/api/budgets/dashboard?yearMonth=2026-04",
          method: "get",
        },
      },
    });

    renderDashboardContent();

    expect(screen.queryByText("Details")).toBeNull();
    expect(screen.queryByText(/\/api\/budgets\/dashboard/)).toBeNull();
    expect(screen.queryByText(/Network Error/)).toBeNull();
  });

  it("maps raw Network Error to friendly production copy", () => {
    vi.stubEnv("DEV", false);
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: null,
      isError: true,
      error: {
        message: "Network Error",
        isNetworkError: true,
      },
    });

    renderDashboardContent();

    expect(
      screen.getByText(
        "We could not reach the server. Please try again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Network Error")).toBeNull();
  });

  it("does not render the legacy debug breakpoint text", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(screen.queryByText(/p:\s*true/i)).toBeNull();
    expect(screen.queryByText(/desktop:\s*true/i)).toBeNull();
  });

  it("renders the open-month MoneyState anchor and allocation bar (V2 PR2 contract)", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    const moneyState = screen.getByTestId("money-state");
    expect(moneyState).toBeInTheDocument();
    expect(moneyState).toHaveAttribute("data-tone", "positive");

    // The hero opens with the "Open month · {date range}" kicker; the old
    // eyebrow pill and "Left this month" label are gone.
    expect(
      within(moneyState).getByTestId("money-state-kicker").textContent ?? "",
    ).toContain("Open month");
    expect(within(moneyState).queryByText("Money state")).toBeNull();
    expect(within(moneyState).queryByText("Left this month")).toBeNull();

    // The six-term equation row is no longer rendered (V2 PR2) — the flow
    // bar + legend is the single visible "why".
    expect(within(moneyState).queryByTestId("money-state-equation")).toBeNull();

    // AllocationBar (P0 molecule) is wired in.
    expect(
      within(moneyState).getByTestId("money-state-allocation"),
    ).toBeInTheDocument();

    // The ghost action in the allocation header points to the existing
    // deeper breakdown route.
    const breakdownLink = within(moneyState).getByTestId(
      "money-state-breakdown-link",
    );
    expect(breakdownLink).toHaveAttribute("href", "/dashboard/breakdown");
    expect(breakdownLink).toHaveTextContent(/breakdown/i);

    // The old hero copy and analysis CTA must not co-exist with MoneyState.
    expect(
      screen.queryByText("Open month control room"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /explore analysis & trends/i }),
    ).toBeNull();
    expect(screen.queryByText("Edit drawer open")).toBeNull();
  });

  it("does not render the old open-month report cards below the command center", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(screen.queryByText("Budget overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Goals progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Recurring expenses")).not.toBeInTheDocument();
    expect(screen.queryByText("Subscriptions")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Quickly adjust this period"),
    ).not.toBeInTheDocument();
  });

  it("renders the capped insight/action cards led by the deficit card for an open deficit month", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(-350, "open", {
          header: {
            canCloseMonth: false,
            closeMonthButtonLabel: null,
            lifecycleState: "normal",
            closeWindowOpensAt: "2026-05-20T00:00:00Z",
          },
          summary: {
            finalBalance: -350,
            subscriptionsTotal: 299,
            subscriptionsCount: 2,
            totalDebtPayments: 500,
            recurringExpenses: [
              {
                id: "rent",
                nameKey: "rent",
                nameLabel: "Rent",
                categoryKey: "housing",
                categoryLabel: "Housing",
                amountMonthly: 5000,
              },
            ],
          },
        }),
      },
    });

    renderDashboardContent();

    // The AttentionLane was replaced by StandaloneInsightActionCards (V2
    // PR4): same on-device ranking, capped at 3, but rendered as compact
    // cards without the explanatory section framing. For a deficit month it
    // must lead with the deficit card — only an overdue-close outranks it,
    // and this month's lifecycle is "normal", so deficit is guaranteed to be
    // in the top 3.
    const cards = screen.getByTestId("insight-action-cards");

    const cardItems = within(cards).getByTestId("insight-action-cards-items");
    const renderedCount = Number(cardItems.getAttribute("data-count"));
    expect(renderedCount).toBeGreaterThan(0);
    expect(renderedCount).toBeLessThanOrEqual(3);

    // Deficit leads, with the factual (non-shaming) copy and its quick-adjust
    // action label.
    const deficitItem = within(cards).getByTestId("attention-item-deficit");
    expect(
      within(deficitItem).getByText("Plan is over what is coming in"),
    ).toBeInTheDocument();
    expect(
      within(cards).getByTestId("attention-action-deficit"),
    ).toHaveTextContent("Adjust expenses");

    // The old explanatory framing must be gone from the main dashboard.
    expect(screen.queryByText("Worth a quick look")).toBeNull();
    expect(screen.queryByText("How these are chosen")).toBeNull();
    expect(screen.queryByTestId("attention-lane-how-chosen")).toBeNull();

    // The old follow-up strip copy must not co-exist with the cards.
    expect(screen.queryByText("To follow up")).toBeNull();
    expect(screen.queryByText("Money position needs review")).toBeNull();
  });

  it("renders compact month areas without a duplicate deep-dive card", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    // P3 PillarWorkbench renders one card per pillar instead of the legacy
    // `pillarDescriptions` lines. We assert on workbench landmarks rather
    // than the now-unused summary copy.
    expect(screen.getByText("This month by area")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-workbench")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-income")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-expenses")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-savings")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-debts")).toBeInTheDocument();

    expect(screen.queryByText("deepDiveTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("deepDiveBody")).not.toBeInTheDocument();
    expect(screen.queryByText("deepDiveCta")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /go to overview/i })).toBeNull();
    // MoneyState (P2) owns the single secondary route into the deeper
    // breakdown — the old hero "Explore analysis & trends" CTA is gone.
    expect(
      screen.queryByRole("link", { name: /explore analysis & trends/i }),
    ).toBeNull();
    expect(
      screen.getAllByRole("link", { name: "Breakdown" }),
    ).toHaveLength(1);
  });

  it("shows compact subscription leakage insight inside the expenses area", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(245, "open", {
          summary: {
            subscriptionsTotal: 665,
            subscriptionsCount: 5,
          },
        }),
      },
    });

    renderDashboardContent();

    // P3 PillarWorkbench renders a single subscription chip on the expenses
    // pillar with the planned-budget format "{count} · {monthly}/mo · {annual}/yr".
    expect(screen.getAllByText("Subscriptions").length).toBeGreaterThan(0);
    const chip = screen.getByTestId("pillar-expenses-subscriptions");
    expect(chip.textContent ?? "").toMatch(/5/);
    expect(chip.textContent ?? "").toMatch(/\/mo/);
    expect(chip.textContent ?? "").toMatch(/\/yr/);
  });

  it("shows a compact income source insight inside the income area", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        breakdown: {
          ...readyResult.data.breakdown,
          incomeItems: [
            {
              key: "income:0:salary",
              label: "Net salary",
              amount: 42000.5,
            },
            {
              key: "income:1:side:consulting",
              label: "Consulting",
              amount: 7000,
            },
            {
              key: "income:2:member:partner",
              label: "Partner",
              amount: 5000,
            },
          ],
        },
      },
    });

    renderDashboardContent();

    // P3 PillarWorkbench renders salary / side / household as discrete
    // signal rows instead of the legacy "Income sources" concat chip.
    const income = screen.getByTestId("pillar-income");
    expect(income.textContent ?? "").toMatch(/3 sources planned/);
    expect(within(income).getByTestId("pillar-income-salary")).toBeInTheDocument();
    expect(within(income).getByTestId("pillar-income-side")).toBeInTheDocument();
    expect(
      within(income).getByTestId("pillar-income-household"),
    ).toBeInTheDocument();
  });

  it("does not invent an other-income value when only salary exists", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        breakdown: {
          ...readyResult.data.breakdown,
          incomeItems: [
            {
              key: "income:0:salary",
              label: "Net salary",
              amount: 42000.5,
            },
          ],
        },
      },
    });

    renderDashboardContent();

    const income = screen.getByTestId("pillar-income");
    expect(income.textContent ?? "").toMatch(/1 source planned/);
    expect(within(income).getByTestId("pillar-income-salary")).toBeInTheDocument();
    // Side / household signal rows must not appear when no such income is planned.
    expect(within(income).queryByTestId("pillar-income-side")).toBeNull();
    expect(
      within(income).queryByTestId("pillar-income-household"),
    ).toBeNull();
  });

  it("shows quick and full edit actions in the expenses pillar", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(
      screen.getByRole("button", { name: /quick adjust expenses/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit all expenses/i }),
    ).toBeInTheDocument();
  });

  it("opens the edit drawer from the quick expense action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    fireEvent.click(
      screen.getByRole("button", { name: /quick adjust expenses/i }),
    );

    expect(screen.getByText("Edit drawer open: expenses")).toBeInTheDocument();
  });

  it("shows quick and full edit actions in the income pillar", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(
      screen.getByRole("button", { name: /quick adjust income/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /edit all income/i }),
    ).toBeInTheDocument();
  });

  it("opens the income drawer from the quick income action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    fireEvent.click(
      screen.getByRole("button", { name: /quick adjust income/i }),
    );

    expect(screen.getByText("Edit drawer open: income")).toBeInTheDocument();
  });

  it("navigates to the full expense editor from the expenses pillar", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContentWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /edit all expenses/i }));

    expect(screen.getByText("Expenses route")).toBeInTheDocument();
  });

  it("navigates to the full income editor from the income pillar", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContentWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /edit all income/i }));

    expect(screen.getByText("Income route")).toBeInTheDocument();
  });

  it("exposes quick adjust and manage all actions for savings and debts", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(
      screen.getByRole("button", { name: /quick adjust savings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /manage all savings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /quick adjust debts/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /manage all debts/i }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it("opens the edit drawer with the savings panel from the savings pillar quick action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    fireEvent.click(
      screen.getByRole("button", { name: /quick adjust savings/i }),
    );

    expect(screen.getByText("Edit drawer open: savings")).toBeInTheDocument();
  });

  it("navigates to the full savings editor from the savings pillar secondary action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContentWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /manage all savings/i }));

    expect(screen.getByText("Savings route")).toBeInTheDocument();
  });

  it("opens the edit drawer with the debts panel from the debts pillar quick action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    fireEvent.click(
      screen.getByRole("button", { name: /quick adjust debts/i }),
    );

    expect(screen.getByText("Edit drawer open: debts")).toBeInTheDocument();
  });

  it("navigates to the full debts editor from the debts pillar secondary action", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContentWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /manage all debts/i }));

    expect(screen.getByText("Debts route")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // PR4 — Preview-aware Next button.
  //
  // On the active open month with no persisted next month, the rail Next button
  // routes to the read-only preview when one is available; otherwise it stays
  // disabled. A persisted next month always uses normal month navigation. The
  // preview is fetched through the same hook/key as PlanningRow, so no extra
  // request is made and `/dashboard?yearMonth={next}` is never called.
  // --------------------------------------------------------------------------

  it("routes the rail Next button to the next-month preview when the open month has no persisted next and a preview is available", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: buildPreviewDto(),
      isPending: false,
      isError: false,
    });

    renderDashboardContentWithRoutes();

    const nextBtn = screen.getByTestId("month-nav-next");
    expect(nextBtn).not.toBeDisabled();
    expect(nextBtn).toHaveAttribute("data-next-mode", "preview");

    fireEvent.click(nextBtn);

    expect(screen.getByText("Next month preview route")).toBeInTheDocument();
    // Reaching the preview must never switch the dashboard to the next month
    // (which would hit /dashboard?yearMonth={next} and risk materialisation).
    expect(mockSetSelectedYearMonth).not.toHaveBeenCalledWith("2026-05");
  });

  it("keeps the rail Next button disabled on the open month when no preview is available", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    // Default preview mock returns "unavailable" (data: undefined).

    renderDashboardContent();

    const nextBtn = screen.getByTestId("month-nav-next");
    expect(nextBtn).toBeDisabled();
    expect(nextBtn).toHaveAttribute("data-next-mode", "persisted");
  });

  it("uses persisted month navigation for the rail Next button when a persisted next month exists", () => {
    const goToNextMonth = vi.fn();
    const summaryWithNext = buildSummary(245, "open", {
      header: {
        canGoNext: true,
        nextPeriodLabel: "May 2026",
        nextPeriodKey: "2026-05",
      },
    });
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      goToNextMonth,
      data: { ...readyResult.data, summary: summaryWithNext },
    });
    // Even if a preview were available, a persisted next month always wins.
    mockUseNextMonthPreviewQuery.mockReturnValue({
      data: buildPreviewDto(),
      isPending: false,
      isError: false,
    });

    renderDashboardContentWithRoutes();

    const nextBtn = screen.getByTestId("month-nav-next");
    expect(nextBtn).not.toBeDisabled();
    expect(nextBtn).toHaveAttribute("data-next-mode", "persisted");

    fireEvent.click(nextBtn);

    expect(goToNextMonth).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Next month preview route")).toBeNull();
  });

  it("opens the close month modal from the month rail trigger with translated title", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    expect(
      screen.getByRole("heading", { name: "Close April 2026?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^close april 2026$/i }),
    ).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // P6 — Close-month flow integration.
  //
  // The MonthRail close CTA path is covered above. These tests pin down the
  // two other entry points (CloseBand and the insight-card overdue close
  // action) and the lazy fetch contract for savings-goal completion candidates
  // — all three are part of the locked Spine close-flow story.
  // --------------------------------------------------------------------------

  it("opens the same close month modal from the CloseBand review-and-close CTA", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    // The CloseBand sits under MoneyState on an eligible open month. Its CTA
    // is structurally distinct from the MonthRail "Close Month" trigger but
    // must route through the same controller so we get one close-flow story.
    const closeBandCta = screen.getByTestId("close-band-cta");
    expect(closeBandCta).toHaveTextContent(/review & close/i);

    fireEvent.click(closeBandCta);

    expect(
      screen.getByRole("heading", { name: "Close April 2026?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("close-month-modal")).toBeInTheDocument();
  });

  it("opens the same close month modal from the insight-card overdue close action", () => {
    // Drive the dashboard into an overdue lifecycle so the insight cards
    // raise the close-month action. CloseBand also renders in this state, but
    // the testid scopes the click to the insight-card entry point.
    const overdueSummary = buildSummary(245, "open", {
      header: {
        lifecycleState: "overdue",
        canCloseMonth: true,
        closeMonthButtonLabel: "Close Month",
      },
    });
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: overdueSummary,
      },
    });

    renderDashboardContent();

    fireEvent.click(screen.getByTestId("attention-action-overdue-close"));

    expect(
      screen.getByRole("heading", { name: "Close April 2026?" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("close-month-modal")).toBeInTheDocument();
  });

  it("does not request savings-goal completion candidates until the close modal opens", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    // Before opening: the hook is still invoked (it lives in the controller
    // which always mounts), but `enabled` must be false so the network
    // request never fires. This preserves the dashboard-load contract that
    // editor/close-detail endpoints are lazy.
    expect(
      mockUseSavingsGoalCompletionCandidatesQuery,
    ).toHaveBeenCalled();
    const preOpenCalls = mockUseSavingsGoalCompletionCandidatesQuery.mock.calls;
    expect(preOpenCalls.length).toBeGreaterThan(0);
    for (const [, options] of preOpenCalls) {
      expect(options).toEqual(expect.objectContaining({ enabled: false }));
    }

    mockUseSavingsGoalCompletionCandidatesQuery.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    const postOpenCalls = mockUseSavingsGoalCompletionCandidatesQuery.mock.calls;
    expect(postOpenCalls.length).toBeGreaterThan(0);
    expect(
      postOpenCalls.some(
        ([yearMonth, options]) =>
          yearMonth === "2026-04" &&
          options &&
          (options as { enabled?: boolean }).enabled === true,
      ),
    ).toBe(true);
  });

  it("does not render any 'Edit' affordances inside the close month modal", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    const modal = screen.getByTestId("close-month-modal");
    expect(within(modal).queryByRole("button", { name: /^edit$/i })).toBeNull();
    expect(within(modal).queryByText(/ändra/i)).toBeNull();
  });

  it("shows two carry-over choices when there is a positive surplus", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    const carryOverOption = screen.getByTestId("resolve-carry-over");
    const keepOption = screen.getByTestId("resolve-keep");
    // Carry-over card title is "{nextMonth} gets +{amount}"; keep card makes
    // the financial consequence explicit: nothing is transferred.
    expect(carryOverOption).toHaveTextContent(/carry over/i);
    expect(carryOverOption).toHaveTextContent(/may 2026/i);
    expect(keepOption).toHaveTextContent(/keep/i);
    expect(keepOption).toHaveTextContent(/transfer nothing/i);
    expect(keepOption).toHaveTextContent(/not carried over/i);
    expect(keepOption).not.toHaveTextContent(/2026/);
    expect(keepOption).toHaveAttribute("aria-checked", "true");
    expect(carryOverOption).toHaveAttribute("aria-checked", "false");
  });

  it("lets the user switch between carry-over choices without closing the modal", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    fireEvent.click(screen.getByTestId("resolve-carry-over"));
    expect(screen.getByTestId("resolve-carry-over")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("resolve-keep")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    fireEvent.click(screen.getByTestId("resolve-keep"));
    expect(screen.getByTestId("resolve-keep")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("resolve-carry-over")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    expect(
      screen.getByRole("heading", { name: "Close April 2026?" }),
    ).toBeInTheDocument();
  });

  it("submits carryOverMode none by default, lands on the closed month, and closes the modal", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      closedMonth: {
        yearMonth: "2026-04",
        status: "closed",
        closedAtUtc: "2026-04-30T20:00:00Z",
      },
      snapshotTotals: {
        totalIncomeMonthly: 12000,
        totalExpensesMonthly: 8000,
        totalSavingsMonthly: 750,
        totalDebtPaymentsMonthly: 0,
        finalBalanceMonthly: 245,
      },
      nextMonth: {
        yearMonth: "2026-05",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
      },
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(screen.getByTestId("confirm-close-month"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        yearMonth: "2026-04",
        request: {
          carryOverMode: "none",
        },
      });
    });

    await waitFor(() => {
      // Land on the just-closed month so the handoff card has a stage to
      // render on. The continue CTA on the card later forwards to next month.
      expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-04");
      expect(mockSetSelectedYearMonth).not.toHaveBeenCalledWith("2026-05");
      // The card supersedes the old success toast — no global toast on success.
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("heading", { name: "Close April 2026?" }),
      ).not.toBeInTheDocument();
    });
  });

  it("maps the carry-over choice to carryOverMode full", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      closedMonth: {
        yearMonth: "2026-04",
        status: "closed",
        closedAtUtc: "2026-04-30T20:00:00Z",
      },
      snapshotTotals: {
        totalIncomeMonthly: 12000,
        totalExpensesMonthly: 8000,
        totalSavingsMonthly: 750,
        totalDebtPaymentsMonthly: 0,
        finalBalanceMonthly: 245,
      },
      nextMonth: {
        yearMonth: "2026-05",
        status: "open",
        carryOverMode: "full",
        carryOverAmount: 245,
      },
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(screen.getByTestId("resolve-carry-over"));
    fireEvent.click(screen.getByTestId("confirm-close-month"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        yearMonth: "2026-04",
        request: {
          carryOverMode: "full",
        },
      });
    });
  });

  it("hides the incoming carry-over row when there is no carry-in", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    expect(
      screen.queryByTestId("close-month-summary-incoming-carry-over"),
    ).toBeNull();
  });

  it("renders an incoming carry-over row so the summary reconciles when carry-in is present", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(950, "open", { incomingCarryOverAmount: 668 }),
      },
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    const carryOverRow = screen.getByTestId(
      "close-month-summary-incoming-carry-over",
    );
    expect(carryOverRow).toHaveTextContent(/incoming carry-over/i);
    expect(carryOverRow).toHaveTextContent(/\+.*668/);
  });

  it("keeps the info disclosure collapsed by default and expands it on click", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));

    const disclosureTrigger = screen.getByRole("button", {
      name: /what happens when i close the month/i,
    });
    expect(disclosureTrigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByTestId("close-month-disclosure-panel"),
    ).not.toBeInTheDocument();

    fireEvent.click(disclosureTrigger);

    expect(disclosureTrigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByTestId("close-month-disclosure-panel"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("close-month-disclosure-panel"),
    ).toHaveTextContent(/historical summary/i);
  });

  it("shows an error toast and keeps the modal open when closing fails", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockRejectedValue({
      message: "Close failed.",
      code: "Unknown",
      status: 400,
      isNetworkError: false,
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(screen.getByTestId("confirm-close-month"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Close failed.",
        expect.objectContaining({
          id: "dashboard:close-month:2026-04:error",
        }),
      );
    });

    expect(mockSetSelectedYearMonth).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { name: "Close April 2026?" }),
    ).toBeInTheDocument();
    // Failed close must not surface the success handoff.
    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
  });

  it("does not show the handoff card on a normal closed-month page load", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(245, "closed"),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: buildClosedRecap(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboardContent();

    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
  });

  it("surfaces the handoff card on the closed recap after a successful close, and continues to the next month", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      closedMonth: {
        yearMonth: "2026-04",
        status: "closed",
        closedAtUtc: "2026-04-30T20:00:00Z",
      },
      snapshotTotals: {
        totalIncomeMonthly: 12000,
        totalExpensesMonthly: 8000,
        totalSavingsMonthly: 750,
        totalDebtPaymentsMonthly: 0,
        finalBalanceMonthly: 245,
      },
      nextMonth: {
        yearMonth: "2026-05",
        status: "open",
        carryOverMode: "full",
        carryOverAmount: 245,
      },
    });

    const { rerender } = render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(screen.getByTestId("resolve-carry-over"));
    fireEvent.click(screen.getByTestId("confirm-close-month"));

    await waitFor(() => {
      expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-04");
    });

    // Simulate the closed-month re-render the dashboard query would produce
    // once we land on 2026-04 in its closed state.
    const closedSummary = buildSummary(245, "closed");
    closedSummary.header.nextPeriodLabel = "May 2026";
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: closedSummary,
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: buildClosedRecap(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    const handoff = await screen.findByTestId("closed-month-handoff-card");
    expect(handoff).toHaveAttribute("data-variant", "positiveFull");
    // Headline reads "{month} is saved" in the V2 takeover; the next-month
    // story moves into the subhead and the carry-over surplus panel.
    expect(
      within(handoff).getByTestId("closed-month-handoff-title"),
    ).toHaveTextContent("April 2026 is saved");
    expect(
      within(handoff).getByTestId("closed-month-handoff-body"),
    ).toHaveTextContent(/May 2026/i);
    expect(
      within(handoff).getByTestId("closed-month-handoff-panel-surplus"),
    ).toHaveTextContent(/carried over to May 2026/i);

    // Continue CTA forwards to the next open month and dismisses the card.
    mockSetSelectedYearMonth.mockClear();
    fireEvent.click(within(handoff).getByTestId("closed-month-handoff-continue"));

    expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-05");

    rerender(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
  });

  it("keeps hook ordering stable when dashboard data loads after a pending render", () => {
    mockUseDashboardSummary
      .mockReturnValueOnce(pendingResult)
      .mockReturnValueOnce(readyResult);

    const { rerender } = render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-home-skeleton")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("button", { name: /close month/i }),
    ).toBeInTheDocument();
  });

  it("renders the closed month recap shell from the recap endpoint data", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(245, "closed"),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: {
        month: {
          yearMonth: "2026-04",
          status: "closed",
          openedAtUtc: "2026-04-01T08:00:00Z",
          closedAtUtc: "2026-04-30T20:00:00Z",
          carryOverMode: "custom",
          carryOverAmount: 500,
        },
        snapshotTotals: {
          totalIncomeMonthly: 10000,
          totalExpensesMonthly: 4000,
          totalSavingsMonthly: 1000,
          totalDebtPaymentsMonthly: 500,
          finalBalanceMonthly: 4500,
        },
        comparison: {
          previousComparableYearMonth: "2026-03",
          hasPreviousComparableMonth: true,
          summary: {
            income: {
              previousValue: 9000,
              deltaAmount: 1000,
              deltaPercent: 11.1111111111,
            },
            expenses: {
              previousValue: 4500,
              deltaAmount: -500,
              deltaPercent: -11.1111111111,
            },
            savings: {
              previousValue: 1200,
              deltaAmount: -200,
              deltaPercent: -16.6666666667,
            },
            debtPayments: {
              previousValue: 400,
              deltaAmount: 100,
              deltaPercent: 25,
            },
            finalBalance: {
              previousValue: 2900,
              deltaAmount: 1600,
              deltaPercent: 55.1724137931,
            },
          },
        },
        expenseCategories: [
          {
            categoryId: "food",
            categoryName: "Food",
            currentAmount: 1800,
            previousAmount: 1500,
            deltaAmount: 300,
            deltaPercent: 20,
          },
          {
            categoryId: "transport",
            categoryName: "Transport",
            currentAmount: 250,
            previousAmount: 500,
            deltaAmount: -250,
            deltaPercent: -50,
          },
          {
            categoryId: "fixed",
            categoryName: "FixedExpense",
            currentAmount: 100,
            previousAmount: 0,
            deltaAmount: 100,
            deltaPercent: null,
          },
        ],
        subscriptionInsight: {
          active: [
            {
              identityKey: "source:spotify",
              name: "Spotify",
              amountMonthly: 109,
              sourceExpenseItemId: "spotify",
            },
          ],
          new: [
            {
              identityKey: "name:NOTION",
              name: "Notion",
              amountMonthly: 80,
              sourceExpenseItemId: null,
            },
          ],
          removed: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 119,
              sourceExpenseItemId: null,
            },
          ],
          paused: [],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
        savingsDetail: {
          totalSavingsMonthly: 1000,
          activeGoals: [
            {
              id: "goal-emergency",
              sourceSavingsGoalId: "source-goal-emergency",
              name: "Emergency fund",
              monthlyContribution: 700,
              targetAmount: 10000,
              targetDate: "2026-12-01T00:00:00Z",
              amountSaved: 2500,
              previousMonthlyContribution: 600,
              deltaMonthlyContribution: 100,
            },
          ],
          hasPreviousComparableMonth: true,
        },
        debtDetail: {
          totalDebtPaymentsMonthly: 500,
          activeDebts: [
            {
              id: "debt-card",
              sourceDebtId: "source-debt-card",
              name: "Credit card",
              type: "revolving",
              balance: 2400,
              apr: 19.5,
              monthlyPayment: 500,
              minPayment: 450,
              monthlyFee: 50,
              termMonths: null,
              previousMonthlyPayment: 400,
              deltaMonthlyPayment: 100,
            },
          ],
          hasPreviousComparableMonth: true,
        },
        insightDrivers: emptyInsightDrivers(),
        carryOverOutcome: {
          mode: "custom",
          amount: 500,
          targetYearMonth: "2026-05",
          wasApplied: true,
        },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("closed-month-recap")).toBeInTheDocument();
    expect(mockUseBudgetMonthRecapQuery).toHaveBeenCalledWith("2026-04", {
      enabled: true,
    });
    expect(
      screen.getByRole("heading", { name: /april 2026/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
    expect(screen.getByTestId("closed-month-summary")).toHaveTextContent(
      /clear margin/i,
    );
    expect(screen.getByTestId("closed-month-recap")).toHaveTextContent(
      /monthly takeaway/i,
    );
    expect(screen.getByTestId("closed-month-recap")).not.toHaveTextContent(
      /locked snapshot for april 2026/i,
    );
    expect(screen.getByTestId("month-rail")).not.toHaveTextContent(
      /comparison baseline/i,
    );
    const heroResult = screen.getByTestId("closed-month-hero-result");
    expect(heroResult).toHaveTextContent(/4,500/);
    expect(screen.getByTestId("closed-month-hero-carry-over")).toHaveTextContent(
      /500/,
    );
    expect(screen.getByTestId("closed-month-hero-carry-over")).toHaveTextContent(
      /may 2026/i,
    );

    const incomeCard = screen.getByRole("article", {
      name: /income snapshot total/i,
    });
    expect(incomeCard).toHaveTextContent("Income");
    expect(incomeCard).not.toHaveTextContent(/carry-over/i);
    expect(
      screen.getByRole("article", { name: /expenses snapshot total/i }),
    ).toHaveTextContent("Expenses");
    expect(
      screen.getByRole("article", { name: /savings snapshot total/i }),
    ).toHaveTextContent("Savings");
    expect(
      screen.getByRole("article", { name: /debt payments snapshot total/i }),
    ).toHaveTextContent("Debt payments");
    expect(
      screen.queryByRole("article", { name: /final balance snapshot total/i }),
    ).toBeNull();

    const nextStep = screen.getByTestId("closed-month-next-step");
    expect(
      within(nextStep).getByRole("heading", { name: /next step/i }),
    ).toBeInTheDocument();
    expect(
      within(nextStep).getByTestId("closed-month-carry-over"),
    ).toHaveTextContent(/500/);
    expect(
      within(nextStep).getByTestId("closed-month-carry-over"),
    ).toHaveTextContent(/may 2026/i);
    expect(
      within(nextStep).getByRole("button", {
        name: /continue to may 2026/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("closed-month-chart-tab-flow")).toBeNull();
    expect(screen.getByTestId("closed-month-chart-card")).toBeInTheDocument();
    expect(screen.getByTestId("closed-month-chart-tab-compare")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("closed-month-hero-flow")).toBeInTheDocument();
    expect(screen.getByText("Where did the money go?")).toBeInTheDocument();
    expect(screen.getByText("From starting point to final balance")).toBeInTheDocument();
    expect(screen.getByTestId("closed-month-hero-flow-available")).toHaveTextContent(
      "Available",
    );
    expect(screen.getByTestId("closed-month-hero-flow-available")).toHaveTextContent(
      /10,500/,
    );
    expect(screen.getByTestId("closed-month-hero-flow-carry-over")).toHaveTextContent(
      "Carry-over",
    );
    expect(screen.getByTestId("closed-month-hero-flow-carry-over")).toHaveTextContent(
      /500/,
    );
    expect(screen.getByTestId("closed-month-hero-flow-income")).toHaveTextContent(
      "Income",
    );
    expect(screen.getByTestId("closed-month-hero-flow-income")).toHaveTextContent(
      /10,000/,
    );
    expect(
      screen.getByTestId("closed-month-hero-flow-income"),
    ).not.toHaveTextContent(/10,500/);
    expect(screen.getByTestId("closed-month-hero-flow-expenses")).toHaveTextContent(
      "Expenses",
    );
    expect(screen.getByTestId("closed-month-hero-flow-savings")).toHaveTextContent(
      "Savings",
    );
    expect(
      screen.getByTestId("closed-month-hero-flow-debt-payments"),
    ).toHaveTextContent("Debt");
    expect(
      screen.getByTestId("closed-month-hero-flow-final-balance"),
    ).toHaveTextContent("Final balance");
    expect(
      screen.getByTestId("closed-month-hero-flow-final-balance"),
    ).toHaveTextContent(/4,500/);
    const comparison = screen.getByTestId("closed-month-comparison");
    expect(comparison).toHaveTextContent(/previous closed month: march 2026/i);
    expect(screen.getByTestId("closed-month-comparison-income")).toHaveTextContent(
      /\+.*1,000/,
    );
    expect(
      screen.getByTestId("closed-month-comparison-income-percent"),
    ).toHaveTextContent(/\+11.1%/);
    expect(screen.getByTestId("closed-month-comparison-expenses")).toHaveAttribute(
      "data-tone",
      "positive",
    );
    expect(screen.getByTestId("closed-month-comparison-savings")).toHaveAttribute(
      "data-tone",
      "attention",
    );
    expect(
      screen.getByTestId("closed-month-comparison-finalBalance"),
    ).toHaveAttribute("data-tone", "positive");
    fireEvent.click(screen.getByTestId("closed-month-chart-tab-categories"));
    const expenseCategories = screen.getByTestId(
      "closed-month-expense-categories",
    );
    expect(expenseCategories).toHaveTextContent(
      /categories are sorted by the largest movement/i,
    );
    expect(screen.getByTestId("closed-month-expense-category-food")).toHaveAttribute(
      "data-tone",
      "attention",
    );
    expect(
      screen.getByTestId("closed-month-expense-category-food-percent"),
    ).toHaveTextContent(/\+20%/);
    expect(
      screen.getByTestId("closed-month-expense-category-transport"),
    ).toHaveAttribute("data-tone", "positive");
    expect(expenseCategories).toHaveTextContent("Bills & essentials");
    expect(expenseCategories).not.toHaveTextContent("FixedExpense");
    expect(
      screen.queryByTestId("closed-month-expense-category-fixed-percent"),
    ).toBeNull();
    const subscriptions = screen.getByTestId("closed-month-subscriptions");
    const detailLayer = screen.getByTestId("closed-month-detail-layer");
    expect(detailLayer).toHaveTextContent(/month details/i);
    expect(detailLayer).toHaveTextContent(/records behind the locked snapshot/i);
    expect(subscriptions).toHaveTextContent(/recurring costs/i);
    expect(subscriptions).toHaveTextContent("Spotify");
    expect(subscriptions).toHaveTextContent("Notion");
    expect(subscriptions).toHaveTextContent("HBO");
    const savingsDetail = screen.getByTestId("closed-month-savings-detail");
    expect(savingsDetail).toHaveTextContent(/goals and contributions from the locked month/i);
    expect(savingsDetail).toHaveTextContent("Emergency fund");
    expect(savingsDetail).toHaveTextContent(/700/);
    expect(savingsDetail).toHaveTextContent(/\+.*100/);
    const debtDetail = screen.getByTestId("closed-month-debt-detail");
    expect(debtDetail).toHaveTextContent(/payments and debt status from the locked month/i);
    expect(debtDetail).toHaveTextContent("Credit card");
    expect(debtDetail).toHaveTextContent(/2,400/);
    expect(debtDetail).toHaveTextContent(/\+.*100/);
    expect(screen.queryByRole("button", { name: /close month/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add expense/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^edit$/i })).toBeNull();
    expect(screen.queryByText("Edit drawer open")).toBeNull();
  });

  it("renders comparison tones and hides percent when previous value is zero", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(245, "closed"),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: {
        month: {
          yearMonth: "2026-04",
          status: "closed",
          openedAtUtc: "2026-04-01T08:00:00Z",
          closedAtUtc: "2026-04-30T20:00:00Z",
          carryOverMode: "none",
          carryOverAmount: null,
        },
        snapshotTotals: {
          totalIncomeMonthly: 10000,
          totalExpensesMonthly: 4000,
          totalSavingsMonthly: 1000,
          totalDebtPaymentsMonthly: 500,
          finalBalanceMonthly: 4500,
        },
        comparison: {
          previousComparableYearMonth: "2026-03",
          hasPreviousComparableMonth: true,
          summary: {
            income: {
              previousValue: 10000,
              deltaAmount: 0,
              deltaPercent: 0,
            },
            expenses: {
              previousValue: 0,
              deltaAmount: 4000,
              deltaPercent: null,
            },
            savings: {
              previousValue: 1500,
              deltaAmount: -500,
              deltaPercent: -33.3333333333,
            },
            debtPayments: {
              previousValue: 750,
              deltaAmount: -250,
              deltaPercent: -33.3333333333,
            },
            finalBalance: {
              previousValue: 4000,
              deltaAmount: 500,
              deltaPercent: 12.5,
            },
          },
        },
        expenseCategories: [
          {
            categoryId: "expenses-zero-previous",
            categoryName: "Utilities",
            currentAmount: 4000,
            previousAmount: 0,
            deltaAmount: 4000,
            deltaPercent: null,
          },
        ],
        subscriptionInsight: emptySubscriptionInsight(),
        savingsDetail: emptySavingsDetail(),
        debtDetail: emptyDebtDetail(),
        insightDrivers: emptyInsightDrivers(),
        carryOverOutcome: noCarryOverOutcome(),
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId("closed-month-chart-tab-compare"));
    expect(screen.getByTestId("closed-month-comparison-expenses")).toHaveAttribute(
      "data-tone",
      "attention",
    );
    expect(
      screen.queryByTestId("closed-month-comparison-expenses-percent"),
    ).toBeNull();
    expect(screen.getByTestId("closed-month-comparison-savings")).toHaveAttribute(
      "data-tone",
      "attention",
    );
    expect(
      screen.getByTestId("closed-month-comparison-finalBalance"),
    ).toHaveAttribute("data-tone", "positive");
    fireEvent.click(screen.getByTestId("closed-month-chart-tab-categories"));
    expect(
      screen.queryByTestId(
        "closed-month-expense-category-expenses-zero-previous-percent",
      ),
    ).toBeNull();
  });

  it("injects a single-driver clause into the hero takeaway when expenses rose", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        comparison: {
          previousComparableYearMonth: "2026-03",
          hasPreviousComparableMonth: true,
          summary: {
            income: { previousValue: 9000, deltaAmount: 1000, deltaPercent: 11.1 },
            expenses: { previousValue: 3500, deltaAmount: 500, deltaPercent: 14.3 },
            savings: { previousValue: 1200, deltaAmount: -200, deltaPercent: -16.7 },
            debtPayments: { previousValue: 400, deltaAmount: 100, deltaPercent: 25 },
            finalBalance: { previousValue: 2900, deltaAmount: 1600, deltaPercent: 55.2 },
          },
        },
        insightDrivers: {
          expenseIncreaseDrivers: [
            {
              categoryId: "food",
              categoryName: "Food",
              currentAmount: 1800,
              previousAmount: 1500,
              deltaAmount: 300,
              deltaPercent: 20,
            },
          ],
          largestExpenseIncreaseDriver: {
            categoryId: "food",
            categoryName: "Food",
            currentAmount: 1800,
            previousAmount: 1500,
            deltaAmount: 300,
            deltaPercent: 20,
          },
        },
      }),
    );

    renderDashboardContent();

    const summary = screen.getByTestId("closed-month-summary");
    expect(summary).toHaveTextContent(/expenses increased/i);
    expect(summary).toHaveTextContent(/driven mainly by food/i);
    expect(summary).toHaveTextContent(/\+.*300/);
  });

  it("injects a paired-driver clause into the hero takeaway when expenses rose", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        comparison: {
          previousComparableYearMonth: "2026-03",
          hasPreviousComparableMonth: true,
          summary: {
            income: { previousValue: 9000, deltaAmount: 1000, deltaPercent: 11.1 },
            expenses: { previousValue: 3500, deltaAmount: 800, deltaPercent: 22.9 },
            savings: { previousValue: 1200, deltaAmount: -200, deltaPercent: -16.7 },
            debtPayments: { previousValue: 400, deltaAmount: 100, deltaPercent: 25 },
            finalBalance: { previousValue: 2900, deltaAmount: 1600, deltaPercent: 55.2 },
          },
        },
        insightDrivers: {
          expenseIncreaseDrivers: [
            {
              categoryId: "food",
              categoryName: "Food",
              currentAmount: 1800,
              previousAmount: 1500,
              deltaAmount: 300,
              deltaPercent: 20,
            },
            {
              categoryId: "transport",
              categoryName: "Transport",
              currentAmount: 700,
              previousAmount: 500,
              deltaAmount: 200,
              deltaPercent: 40,
            },
          ],
          largestExpenseIncreaseDriver: {
            categoryId: "food",
            categoryName: "Food",
            currentAmount: 1800,
            previousAmount: 1500,
            deltaAmount: 300,
            deltaPercent: 20,
          },
        },
      }),
    );

    renderDashboardContent();

    const summary = screen.getByTestId("closed-month-summary");
    expect(summary).toHaveTextContent(/driven mainly by food/i);
    expect(summary).toHaveTextContent(/and transport/i);
    expect(summary).toHaveTextContent(/\+.*300/);
    expect(summary).toHaveTextContent(/\+.*200/);
  });

  it("does not append a driver clause when no previous comparable month exists", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        comparison: {
          previousComparableYearMonth: null,
          hasPreviousComparableMonth: false,
          summary: null,
        },
        insightDrivers: emptyInsightDrivers(),
      }),
    );

    renderDashboardContent();

    const summary = screen.getByTestId("closed-month-summary");
    expect(summary).not.toHaveTextContent(/driven mainly by/i);
  });

  it("does not append a driver clause when expenses did not increase", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        // The default buildClosedRecap already has expenses.deltaAmount = -500
        // (i.e. expenses fell). Even if drivers exist, they must not surface.
        insightDrivers: {
          expenseIncreaseDrivers: [
            {
              categoryId: "food",
              categoryName: "Food",
              currentAmount: 100,
              previousAmount: 50,
              deltaAmount: 50,
              deltaPercent: 100,
            },
          ],
          largestExpenseIncreaseDriver: {
            categoryId: "food",
            categoryName: "Food",
            currentAmount: 100,
            previousAmount: 50,
            deltaAmount: 50,
            deltaPercent: 100,
          },
        },
      }),
    );

    renderDashboardContent();

    const summary = screen.getByTestId("closed-month-summary");
    expect(summary).not.toHaveTextContent(/driven mainly by/i);
  });

  it("shows calm deficit guidance when a closed month snapshot ends negative", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildSummary(-750, "closed"),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: {
        month: {
          yearMonth: "2026-04",
          status: "closed",
          openedAtUtc: "2026-04-01T08:00:00Z",
          closedAtUtc: "2026-04-30T20:00:00Z",
          carryOverMode: "none",
          carryOverAmount: null,
        },
        snapshotTotals: {
          totalIncomeMonthly: 10000,
          totalExpensesMonthly: 12000,
          totalSavingsMonthly: 1000,
          totalDebtPaymentsMonthly: 500,
          finalBalanceMonthly: -3500,
        },
        comparison: {
          previousComparableYearMonth: null,
          hasPreviousComparableMonth: false,
          summary: null,
        },
        expenseCategories: [
          {
            categoryId: "food",
            categoryName: "Food",
            currentAmount: 900,
            previousAmount: null,
            deltaAmount: null,
            deltaPercent: null,
          },
        ],
        subscriptionInsight: emptySubscriptionInsight(),
        savingsDetail: emptySavingsDetail(),
        debtDetail: emptyDebtDetail(),
        insightDrivers: emptyInsightDrivers(),
        carryOverOutcome: noCarryOverOutcome(),
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("closed-month-hero-final-balance")).toHaveTextContent(
      "-",
    );
    expect(
      screen.getByRole("article", { name: /deficit guidance/i }),
    ).toHaveTextContent(/closed with a deficit/i);
    expect(screen.queryByTestId("closed-month-chart-tab-flow")).toBeNull();
    expect(screen.queryByTestId("closed-month-chart-tab-compare")).toBeNull();
    expect(screen.queryByTestId("closed-month-chart-tab-categories")).toBeNull();
    expect(
      screen.getByRole("heading", { name: /what did the month consist of/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("closed-month-hero-flow")).toBeInTheDocument();
    expect(
      screen.queryByTestId("closed-month-comparison-income-percent"),
    ).toBeNull();
    expect(screen.getByTestId("closed-month-expense-categories")).toHaveTextContent(
      /no previous month is available/i,
    );
    expect(screen.getByTestId("closed-month-expense-category-food")).toHaveTextContent(
      /900/,
    );
    expect(screen.getByTestId("closed-month-carry-over")).toHaveTextContent(
      /nothing was carried into may 2026/i,
    );
  });

  it("renders the subscription insight section", () => {
    mockClosedMonthDashboard();

    renderDashboardContent();

    expect(screen.getByTestId("closed-month-subscriptions")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recurring costs" }),
    ).toBeInTheDocument();
  });

  it("renders active subscriptions from the recap DTO", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [
            {
              identityKey: "source:spotify",
              name: "Spotify",
              amountMonthly: 109,
              sourceExpenseItemId: "spotify",
            },
          ],
          new: [],
          removed: [],
          paused: [],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const active = screen.getByTestId("closed-month-subscriptions-active");
    expect(active).toHaveTextContent("Still active");
    expect(active).toHaveTextContent("Spotify");
    expect(active).toHaveTextContent(/109/);
  });

  it("renders new subscriptions from the recap DTO", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [
            {
              identityKey: "name:NOTION",
              name: "Notion",
              amountMonthly: 80,
              sourceExpenseItemId: null,
            },
          ],
          removed: [],
          paused: [],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const added = screen.getByTestId("closed-month-subscriptions-new");
    expect(added).toHaveTextContent("New");
    expect(added).toHaveTextContent("Notion");
  });

  it("renders removed subscriptions from the recap DTO", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [],
          removed: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 119,
              sourceExpenseItemId: null,
            },
          ],
          paused: [],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const removed = screen.getByTestId("closed-month-subscriptions-removed");
    expect(removed).toHaveTextContent("Removed");
    expect(removed).toHaveTextContent("HBO");
  });

  it("renders the no previous comparable month helper for subscriptions", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        comparison: {
          previousComparableYearMonth: null,
          hasPreviousComparableMonth: false,
          summary: null,
        },
        subscriptionInsight: {
          active: [
            {
              identityKey: "name:DROPBOX",
              name: "Dropbox",
              amountMonthly: 120,
              sourceExpenseItemId: null,
            },
          ],
          new: [],
          removed: [],
          paused: [
            {
              identityKey: "name:NETFLIX",
              name: "Netflix",
              amountMonthly: 129,
              sourceExpenseItemId: null,
            },
          ],
          cancelled: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 99,
              sourceExpenseItemId: null,
            },
          ],
          hasPreviousComparableMonth: false,
        },
      }),
    );

    renderDashboardContent();

    expect(screen.getByTestId("closed-month-subscriptions")).toHaveTextContent(
      /new or active recurring expenses this month/i,
    );
    expect(screen.getByTestId("closed-month-subscriptions-active")).toHaveTextContent(
      "Active subscriptions",
    );
    expect(screen.getByTestId("closed-month-subscriptions-paused")).toHaveTextContent(
      "Netflix",
    );
    expect(
      screen.getByTestId("closed-month-subscriptions-cancelled"),
    ).toHaveTextContent("HBO");
    expect(screen.queryByTestId("closed-month-subscriptions-new")).toBeNull();
  });

  it("renders the subscription empty state", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: emptySubscriptionInsight(),
      }),
    );

    renderDashboardContent();

    expect(screen.getByTestId("closed-month-subscriptions-empty")).toHaveTextContent(
      /no new recurring costs were found/i,
    );
  });

  it("renders savings and debt detail empty states from the recap DTO", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        savingsDetail: {
          totalSavingsMonthly: 1000,
          activeGoals: [],
          hasPreviousComparableMonth: false,
        },
        debtDetail: {
          totalDebtPaymentsMonthly: 500,
          activeDebts: [],
          hasPreviousComparableMonth: false,
        },
      }),
    );

    renderDashboardContent();

    expect(screen.getByTestId("closed-month-savings-detail")).toHaveTextContent(
      /goals and contributions from the locked month/i,
    );
    expect(screen.getByTestId("closed-month-savings-empty")).toHaveTextContent(
      /no active savings goals/i,
    );
    expect(screen.getByTestId("closed-month-debt-detail")).toHaveTextContent(
      /payments and debt status from the locked month/i,
    );
    expect(screen.getByTestId("closed-month-debt-empty")).toHaveTextContent(
      /no active debts/i,
    );
  });

  it("renders savings and debt detail rows with supported month-over-month deltas", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        savingsDetail: {
          totalSavingsMonthly: 1400,
          activeGoals: [
            {
              id: "goal-house",
              sourceSavingsGoalId: "source-goal-house",
              name: "House deposit",
              monthlyContribution: 900,
              targetAmount: 50000,
              targetDate: "2027-06-01T00:00:00Z",
              amountSaved: 12000,
              previousMonthlyContribution: 700,
              deltaMonthlyContribution: 200,
            },
          ],
          hasPreviousComparableMonth: true,
        },
        debtDetail: {
          totalDebtPaymentsMonthly: 650,
          activeDebts: [
            {
              id: "debt-loan",
              sourceDebtId: "source-debt-loan",
              name: "Bank loan",
              type: "bank-loan",
              balance: 12000,
              apr: 5.25,
              monthlyPayment: 650,
              minPayment: null,
              monthlyFee: 20,
              termMonths: 24,
              previousMonthlyPayment: 600,
              deltaMonthlyPayment: 50,
            },
          ],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const savings = screen.getByTestId("closed-month-savings-detail");
    expect(savings).toHaveTextContent("House deposit");
    expect(savings).toHaveTextContent(/900/);
    expect(savings).toHaveTextContent(/\+.*200/);
    expect(savings).toHaveTextContent(/50,000/);

    const debt = screen.getByTestId("closed-month-debt-detail");
    expect(debt).toHaveTextContent("Bank loan");
    expect(debt).toHaveTextContent(/12,000/);
    expect(debt).toHaveTextContent(/5.25%/);
    expect(debt).toHaveTextContent(/\+.*50/);
  });

  it("uses positive tone for removed subscriptions", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [],
          removed: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 119,
              sourceExpenseItemId: null,
            },
          ],
          paused: [],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    expect(screen.getByTestId("closed-month-subscriptions-removed")).toHaveAttribute(
      "data-tone",
      "positive",
    );
  });

  it("renders paused subscriptions with not-counted copy", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [],
          removed: [],
          paused: [
            {
              identityKey: "name:NETFLIX",
              name: "Netflix",
              amountMonthly: 129,
              sourceExpenseItemId: null,
            },
          ],
          cancelled: [],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const paused = screen.getByTestId("closed-month-subscriptions-paused");
    expect(paused).toHaveTextContent("Paused");
    expect(paused).toHaveTextContent("Netflix");
    expect(paused).toHaveTextContent("Not counted this month");
    expect(paused).toHaveAttribute("data-tone", "attention");
  });

  it("renders cancelled subscriptions with not-counted copy", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [],
          removed: [],
          paused: [],
          cancelled: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 99,
              sourceExpenseItemId: null,
            },
          ],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    const cancelled = screen.getByTestId("closed-month-subscriptions-cancelled");
    expect(cancelled).toHaveTextContent("Cancelled");
    expect(cancelled).toHaveTextContent("HBO");
    expect(cancelled).toHaveTextContent("Not counted this month");
    expect(cancelled).toHaveAttribute("data-tone", "positive");
  });

  it("does not duplicate paused or cancelled subscriptions into comparison groups", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        subscriptionInsight: {
          active: [],
          new: [],
          removed: [],
          paused: [
            {
              identityKey: "name:NETFLIX",
              name: "Netflix",
              amountMonthly: 129,
              sourceExpenseItemId: null,
            },
          ],
          cancelled: [
            {
              identityKey: "name:HBO",
              name: "HBO",
              amountMonthly: 99,
              sourceExpenseItemId: null,
            },
          ],
          hasPreviousComparableMonth: true,
        },
      }),
    );

    renderDashboardContent();

    expect(screen.queryByTestId("closed-month-subscriptions-active")).toBeNull();
    expect(screen.queryByTestId("closed-month-subscriptions-new")).toBeNull();
    expect(screen.queryByTestId("closed-month-subscriptions-removed")).toBeNull();
    expect(screen.getByTestId("closed-month-subscriptions-paused")).toHaveTextContent(
      "Netflix",
    );
    expect(
      screen.getByTestId("closed-month-subscriptions-cancelled"),
    ).toHaveTextContent("HBO");
  });

  it("renders the skipped month shell without requesting recap data", () => {
    const skippedSummary = buildSummary(0, "skipped");

    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: {
          ...skippedSummary,
          header: {
            ...skippedSummary.header,
            nextPeriodLabel: "May 2026",
            canGoNext: true,
          },
        },
      },
    });

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("skipped-month-state")).toBeInTheDocument();
    expect(screen.getByTestId("month-nav-previous")).toHaveAttribute(
      "title",
      "March 2026",
    );
    expect(screen.getByTestId("active-month-label")).toHaveTextContent(
      "April 2026",
    );
    expect(screen.getByTestId("month-nav-next")).toHaveAttribute(
      "title",
      "May 2026",
    );
    expect(screen.getByTestId("month-status-badge")).toHaveTextContent(
      "Skipped",
    );
    expect(screen.getByTestId("month-rail")).toHaveTextContent(
      /comparisons skip this month/i,
    );
    expect(
      screen.getByRole("heading", { name: /this month was skipped\.?/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/no budget was closed/i)).toBeInTheDocument();
    expect(screen.getByTestId("skipped-month-facts")).toHaveTextContent(
      /no snapshot/i,
    );
    expect(screen.getByTestId("skipped-month-facts")).toHaveTextContent(
      /comparisons skip this month/i,
    );
    expect(screen.getByTestId("skipped-month-facts")).toHaveTextContent(
      /continue with may 2026/i,
    );
    expect(mockUseBudgetMonthRecapQuery).toHaveBeenCalledWith("2026-04", {
      enabled: false,
    });
    expect(screen.queryByRole("button", { name: /close month/i })).toBeNull();
  });

  it("renders the month archive trigger and shows months grouped by year", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    const trigger = screen.getByTestId("month-archive-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAccessibleName(/month archive/i);

    fireEvent.click(trigger);

    const popover = screen.getByTestId("month-archive-popover");
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveTextContent("April");
    expect(popover).toHaveTextContent("March");
    expect(popover).toHaveTextContent("December");
    expect(popover).toHaveTextContent("2026");
    expect(popover).toHaveTextContent("2025");
  });

  it("selecting a month from the archive calls setSelectedYearMonth", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    fireEvent.click(screen.getByTestId("month-archive-trigger"));
    fireEvent.click(screen.getByTestId("month-archive-option-2026-02"));

    expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-02");
    expect(screen.queryByTestId("month-archive-popover")).toBeNull();
  });

  it("shows continue action in the header for a closed month", () => {
    const closedSummary = buildSummary(245, "closed");
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: {
          ...closedSummary,
          header: {
            ...closedSummary.header,
            nextPeriodLabel: "May 2026",
            nextPeriodKey: "2026-05",
            canCloseMonth: false,
            closeMonthButtonLabel: null,
          },
        },
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: buildClosedRecap({
        comparison: {
          previousComparableYearMonth: null,
          hasPreviousComparableMonth: false,
          summary: null,
        },
      }),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboardContent();

    const continueAction = screen.getByTestId("period-action-continue");
    expect(continueAction).toBeInTheDocument();
    expect(continueAction).toHaveTextContent(/continue with may 2026/i);

    fireEvent.click(continueAction);
    expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-05");
  });

  it("shows continue action in the header for a skipped month", () => {
    const skippedSummary = buildSummary(0, "skipped");
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: {
          ...skippedSummary,
          header: {
            ...skippedSummary.header,
            nextPeriodLabel: "May 2026",
            nextPeriodKey: "2026-05",
            canGoNext: true,
            canCloseMonth: false,
            closeMonthButtonLabel: null,
          },
        },
      },
    });

    renderDashboardContent();

    const continueAction = screen.getByTestId("period-action-continue");
    expect(continueAction).toHaveTextContent(/continue with may 2026/i);

    fireEvent.click(continueAction);
    expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-05");
  });

  it("disables the next month button when the next period is unavailable", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(screen.getByTestId("month-nav-next")).toBeDisabled();
    expect(screen.getByTestId("month-nav-previous")).not.toBeDisabled();
  });

  it("renders the full carry-over amount and target month from carryOverOutcome", () => {
    // Source row carries the legacy NULL CarryOverAmount the next-month row
    // gets after a `full` close. The recap must surface the applied amount
    // from carryOverOutcome regardless of what month.* says.
    mockClosedMonthDashboard(
      buildClosedRecap({
        month: {
          yearMonth: "2026-04",
          status: "closed",
          openedAtUtc: "2026-04-01T08:00:00Z",
          closedAtUtc: "2026-04-30T20:00:00Z",
          carryOverMode: "none",
          carryOverAmount: null,
        },
        carryOverOutcome: fullCarryOverOutcome(750, "2026-05"),
      }),
    );

    renderDashboardContent();

    const heroCarryOver = screen.getByTestId("closed-month-hero-carry-over");
    expect(heroCarryOver).toHaveTextContent(/750/);
    expect(heroCarryOver).toHaveTextContent(/may 2026/i);

    const nextStepCarryOver = screen.getByTestId("closed-month-carry-over");
    expect(nextStepCarryOver).toHaveTextContent(/750/);
    expect(nextStepCarryOver).toHaveTextContent(/may 2026/i);

    // Snapshot totals must remain unchanged — carry-over is shown
    // separately and never folded into income or any total.
    const incomeCard = screen.getByRole("article", {
      name: /income snapshot total/i,
    });
    expect(incomeCard).not.toHaveTextContent(/750/);
    expect(incomeCard).not.toHaveTextContent(/carry-over/i);
  });

  it("renders no applied carry-over text when carryOverOutcome.wasApplied is false", () => {
    mockClosedMonthDashboard(
      buildClosedRecap({
        carryOverOutcome: noCarryOverOutcome("2026-05"),
      }),
    );

    renderDashboardContent();

    const heroCarryOver = screen.getByTestId("closed-month-hero-carry-over");
    expect(heroCarryOver).toHaveTextContent(/not carried into the next month/i);

    const nextStepCarryOver = screen.getByTestId("closed-month-carry-over");
    expect(nextStepCarryOver).toHaveTextContent(/nothing was carried into may 2026/i);
  });

  it("ignores legacy month.carryOverAmount when carryOverOutcome.wasApplied is false", () => {
    // A legacy row may still have a non-null CarryOverAmount on the closed
    // source month, but without a lifecycle event the outcome is "not
    // applied". The UI must trust the outcome, not the legacy value.
    mockClosedMonthDashboard(
      buildClosedRecap({
        month: {
          yearMonth: "2026-04",
          status: "closed",
          openedAtUtc: "2026-04-01T08:00:00Z",
          closedAtUtc: "2026-04-30T20:00:00Z",
          carryOverMode: "full",
          carryOverAmount: 999,
        },
        carryOverOutcome: noCarryOverOutcome("2026-05"),
      }),
    );

    renderDashboardContent();

    const heroCarryOver = screen.getByTestId("closed-month-hero-carry-over");
    expect(heroCarryOver).not.toHaveTextContent(/999/);

    const nextStepCarryOver = screen.getByTestId("closed-month-carry-over");
    expect(nextStepCarryOver).not.toHaveTextContent(/999/);
    expect(nextStepCarryOver).toHaveTextContent(/nothing was carried into may 2026/i);
  });

  // --------------------------------------------------------------------------
  // Period header polish: close-availability countdown, ready-to-close chip,
  // continue-CTA suppression while the handoff card is up, active-segment
  // highlight, and the now-removed debug overlay.
  // --------------------------------------------------------------------------

  function buildOpenSummaryWithCloseWindow(opensAt: string | null) {
    const summary = buildSummary(245, "open");
    summary.header = {
      ...summary.header,
      nextPeriodLabel: "May 2026",
      nextPeriodKey: "2026-05",
      lifecycleState: "normal",
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      closeWindowOpensAt: opensAt,
      closeEligibleAt: opensAt,
    };
    return summary;
  }

  function buildOpenSummaryReadyToClose() {
    const summary = buildSummary(245, "open");
    summary.header = {
      ...summary.header,
      nextPeriodLabel: "May 2026",
      nextPeriodKey: "2026-05",
      lifecycleState: "eligible",
      canCloseMonth: true,
      closeMonthButtonLabel: "Close Month",
    };
    return summary;
  }

  function buildClosedSummaryReadyToContinue() {
    const summary = buildSummary(245, "closed");
    summary.header = {
      ...summary.header,
      nextPeriodLabel: "May 2026",
      nextPeriodKey: "2026-05",
      canCloseMonth: false,
      closeMonthButtonLabel: null,
    };
    return summary;
  }

  it("keeps the close countdown out of the period header on an open month not yet ready to close", () => {
    // 17 days from a fixed wall-clock anchor so the test is stable.
    const now = new Date("2026-04-08T12:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      mockUseDashboardSummary.mockReturnValue({
        ...readyResult,
        data: {
          ...readyResult.data,
          summary: buildOpenSummaryWithCloseWindow("2026-04-25T12:00:00Z"),
        },
      });

      renderDashboardContent();

      const frame = screen.getByTestId("month-rail");
      expect(frame).not.toHaveTextContent(
        /the month can be closed in 17 days/i,
      );
      // MoneyState (P2) replaced the legacy command-hero countdown panel
      // that used to echo the close-availability label, so the FollowUpStrip
      // "Closing window" item is now the sole surface for the countdown
      // copy on an open, not-yet-ready month.
      expect(screen.getAllByText(/the month can be closed in 17 days/i)).toHaveLength(
        1,
      );
      expect(frame).not.toHaveTextContent(/ready to close/i);
      expect(screen.queryByTestId("close-month-cta")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the open status structural and shows the close CTA when an open month is eligible", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildOpenSummaryReadyToClose(),
      },
    });

    renderDashboardContent();

    expect(screen.getByTestId("month-status-badge")).toHaveTextContent(/open/i);
    expect(screen.getByTestId("close-month-cta")).toBeInTheDocument();
    expect(screen.getByTestId("month-rail")).not.toHaveTextContent(
      /the month can be closed in/i,
    );
    expect(screen.getByTestId("month-rail")).not.toHaveTextContent(
      /ready to close/i,
    );
  });

  it("does not show a green close CTA on a normal closed-month revisit", () => {
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildClosedSummaryReadyToContinue(),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: buildClosedRecap(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    renderDashboardContent();

    expect(screen.queryByTestId("close-month-cta")).toBeNull();
    // Normal closed revisit (no fresh handoff state) keeps the subtle
    // continue affordance in the header.
    expect(screen.getByTestId("period-action-continue")).toBeInTheDocument();
    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
  });

  it("hides the header continue CTA while the just-closed handoff card is visible, and restores it after dismiss", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      closedMonth: {
        yearMonth: "2026-04",
        status: "closed",
        closedAtUtc: "2026-04-30T20:00:00Z",
      },
      snapshotTotals: {
        totalIncomeMonthly: 12000,
        totalExpensesMonthly: 8000,
        totalSavingsMonthly: 750,
        totalDebtPaymentsMonthly: 0,
        finalBalanceMonthly: 245,
      },
      nextMonth: {
        yearMonth: "2026-05",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
      },
    });

    const { rerender } = render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(screen.getByTestId("confirm-close-month"));

    await waitFor(() => {
      expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-04");
    });

    // Switch the dashboard mock to the closed-month state so the recap +
    // handoff card render on rerender.
    mockUseDashboardSummary.mockReturnValue({
      ...readyResult,
      data: {
        ...readyResult.data,
        summary: buildClosedSummaryReadyToContinue(),
      },
    });
    mockUseBudgetMonthRecapQuery.mockReturnValue({
      data: buildClosedRecap(),
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    // While the handoff is up, the handoff CTA owns "continue" — header
    // continue is suppressed so there is one calm forward action on screen.
    const handoff = screen.getByTestId("closed-month-handoff-card");
    expect(
      within(handoff).getByTestId("closed-month-handoff-continue"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("period-action-continue")).toBeNull();

    // Dismiss the handoff. The header continue CTA should reappear because
    // the closed-month dashboard is still showing.
    fireEvent.click(within(handoff).getByTestId("closed-month-handoff-dismiss"));

    rerender(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("period-action-continue")).toBeInTheDocument();
  });

  it("renders the active month label with the rail anchor treatment", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    const activeMonth = screen.getByTestId("active-month-label");
    expect(activeMonth).toHaveAttribute("data-active", "true");
    // The active month is the spine's page anchor: extrabold typography on
    // the period label, with the status pill rendered inline next to it.
    const label = activeMonth.querySelector("span");
    expect(label).not.toBeNull();
    expect(label!.className).toMatch(/font-extrabold/);
    expect(
      within(activeMonth).getByTestId("month-status-badge"),
    ).toBeInTheDocument();
  });
});

// The dev-only `<MediaQueryTest>` overlay used to print "isDesktop: …" in
// the top-left of the page. It is removed from the layout now and should
// not be re-imported anywhere.
describe("RootLayout", () => {
  it("does not import the MediaQueryTest debug overlay", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const url = await import("node:url");

    const here = path.dirname(url.fileURLToPath(import.meta.url));
    const layoutPath = path.resolve(
      here,
      "..",
      "..",
      "..",
      "..",
      "layout",
      "RootLayout.tsx",
    );
    const mediaQueryTestPath = path.resolve(
      here,
      "..",
      "..",
      "..",
      "..",
      "components",
      "Test",
      "MediaQueryTest.tsx",
    );

    const source = await fs.readFile(layoutPath, "utf8");
    expect(source).not.toMatch(/MediaQueryTest/);
    await expect(fs.access(mediaQueryTestPath)).rejects.toThrow();
  });
});
