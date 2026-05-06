import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardContent from "../DashboardContent";

const mockUseDashboardSummary = vi.fn();
const mockUseBudgetMonthRecapQuery = vi.fn();
const mockMutateAsync = vi.fn();
const mockSetSelectedYearMonth = vi.fn();
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
  useAppLocale: () => "en",
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
  default: ({ open }: { open: boolean }) =>
    open ? <div>Edit drawer open</div> : null,
}));

function buildSummary(
  remainingToSpend: number,
  status: "open" | "closed" | "skipped" = "open",
) {
  return {
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
    habitSavings: 500,
    goalSavings: 250,
    totalSavings: 750,
    totalDebtPayments: 0,
    finalBalance: remainingToSpend,
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
  };
}

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

describe("DashboardContent", () => {
  beforeEach(() => {
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

  it("opens the close month modal from the month rail trigger", () => {
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
      screen.getByRole("heading", { name: "Ready to lock in April 2026?" }),
    ).toBeInTheDocument();
  });

  it("review action closes the modal and opens the existing editor flow", () => {
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
    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);

    expect(
      screen.queryByRole("heading", { name: "Ready to lock in April 2026?" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Edit drawer open")).toBeInTheDocument();
  });

  it("submits carryOverMode none by default, advances to the returned month, and closes the modal", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      nextMonth: {
        yearMonth: "2026-05",
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
    fireEvent.click(screen.getByRole("button", { name: /lock april 2026/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        yearMonth: "2026-04",
        request: {
          carryOverMode: "none",
        },
      });
    });

    await waitFor(() => {
      expect(mockSetSelectedYearMonth).toHaveBeenCalledWith("2026-05");
      expect(mockToast.success).toHaveBeenCalledWith(
        "Month closed. You're now viewing May 2026.",
        expect.objectContaining({
          id: "dashboard:close-month:2026-04:success",
        }),
      );
      expect(
        screen.queryByRole("heading", { name: "Ready to lock in April 2026?" }),
      ).not.toBeInTheDocument();
    });
  });

  it("maps a carry-over choice to carryOverMode full", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);
    mockMutateAsync.mockResolvedValue({
      nextMonth: {
        yearMonth: "2026-05",
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
    fireEvent.click(
      screen.getByRole("button", { name: /carry over to may 2026/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /lock april 2026/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        yearMonth: "2026-04",
        request: {
          carryOverMode: "full",
        },
      });
    });
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
    fireEvent.click(screen.getByRole("button", { name: /lock april 2026/i }));

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
      screen.getByRole("heading", { name: "Ready to lock in April 2026?" }),
    ).toBeInTheDocument();
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
    expect(screen.getByTestId("closed-month-chart-tab-compare")).toBeDisabled();
    expect(screen.getByTestId("closed-month-chart-tab-categories")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("closed-month-hero-flow")).toBeInTheDocument();
    expect(
      screen.queryByTestId("closed-month-comparison-income-percent"),
    ).toBeNull();
    fireEvent.click(screen.getByTestId("closed-month-chart-tab-categories"));
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
      screen.getByRole("heading", { name: "This month was skipped" }),
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
});
