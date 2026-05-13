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

  it("renders the open-month command hero", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(
      screen.getByRole("heading", {
        name: "You can relax, but keep the plan current",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Open month control room")).toBeInTheDocument();
    expect(screen.getByText("Money position")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adjust month/i })).toBeNull();

    const analysisLink = screen.getByRole("link", {
      name: /explore analysis & trends/i,
    });
    expect(analysisLink).toHaveAttribute("href", "/dashboard/breakdown");
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

  it("renders deterministic open-month follow-ups from existing summary data", () => {
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

    expect(screen.getByText("To follow up")).toBeInTheDocument();
    expect(screen.getByText("Closing window")).toBeInTheDocument();
    expect(screen.getByText("Money position needs review")).toBeInTheDocument();
    expect(screen.getAllByText("Subscriptions").length).toBeGreaterThan(0);
    expect(screen.queryByText("Debt payments are planned")).toBeNull();
  });

  it("renders compact month areas without a duplicate deep-dive card", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(screen.getByText("This month by area")).toBeInTheDocument();
    expect(screen.getByText("Income is planned for this month.")).toBeInTheDocument();
    expect(screen.getByText("Housing, food and transport")).toBeInTheDocument();
    expect(screen.getByText("2 savings goals")).toBeInTheDocument();
    expect(screen.getByText("No active debt balance")).toBeInTheDocument();

    expect(screen.queryByText("deepDiveTitle")).not.toBeInTheDocument();
    expect(screen.queryByText("deepDiveBody")).not.toBeInTheDocument();
    expect(screen.queryByText("deepDiveCta")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /go to overview/i })).toBeNull();
    expect(
      screen.getAllByRole("link", { name: /explore analysis & trends/i }),
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

    expect(screen.getAllByText("Subscriptions").length).toBeGreaterThan(0);
    expect(screen.getByText(/5 active/)).toHaveTextContent(/year/);
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

    expect(screen.getByText("Income sources")).toBeInTheDocument();
    expect(screen.getByText(/3 active/)).toHaveTextContent(/Net salary/);
    expect(screen.getByText(/3 active/)).toHaveTextContent(/Other/);
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

    expect(screen.getByText("Income sources")).toBeInTheDocument();
    expect(screen.getByText(/1 active/)).toHaveTextContent(/Net salary/);
    expect(screen.getByText(/1 active/)).not.toHaveTextContent(/Other/);
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

  it("exposes the savings manage action and leaves debts coming soon", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    expect(
      screen.getByRole("button", { name: /manage savings/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /manage debts/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /adjust debts/i }),
    ).not.toBeInTheDocument();

    expect(screen.getAllByText("Coming soon")).toHaveLength(1);
  });

  it("navigates to the savings editor from the savings pillar", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContentWithRoutes();

    fireEvent.click(screen.getByRole("button", { name: /manage savings/i }));

    expect(screen.getByText("Savings route")).toBeInTheDocument();
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
    expect(carryOverOption).toHaveTextContent(/carry over to may 2026/i);
    expect(keepOption).toHaveTextContent(/keep in april/i);
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
    expect(
      within(handoff).getByTestId("closed-month-handoff-title"),
    ).toHaveTextContent("April 2026 is closed");
    expect(
      within(handoff).getByTestId("closed-month-handoff-body"),
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
    expect(screen.getByTestId("stable-month-frame")).not.toHaveTextContent(
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
    expect(screen.getByTestId("month-nav-previous")).toHaveTextContent(
      "March 2026",
    );
    expect(screen.getByTestId("active-month-label")).toHaveTextContent(
      "April 2026",
    );
    expect(screen.getByTestId("month-nav-next")).toHaveTextContent("May 2026");
    expect(screen.getByTestId("month-status-badge")).toHaveTextContent(
      "Skipped",
    );
    expect(screen.getByTestId("stable-month-frame")).toHaveTextContent(
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

      const frame = screen.getByTestId("stable-month-frame");
      expect(frame).not.toHaveTextContent(
        /the month can be closed in 17 days/i,
      );
      expect(screen.getAllByText(/the month can be closed in 17 days/i)).toHaveLength(
        2,
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
    expect(screen.getByTestId("stable-month-frame")).not.toHaveTextContent(
      /the month can be closed in/i,
    );
    expect(screen.getByTestId("stable-month-frame")).not.toHaveTextContent(
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

  it("renders the active month label with the calm selected-segment treatment", () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    renderDashboardContent();

    const activeMonth = screen.getByTestId("active-month-label");
    expect(activeMonth).toHaveAttribute("data-active", "true");
    // Subtle accent ring on the white segment surface.
    expect(activeMonth.className).toMatch(/ring-eb-accent\/20/);
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
