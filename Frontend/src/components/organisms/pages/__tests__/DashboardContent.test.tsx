import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DashboardContent from "../DashboardContent";

const mockUseDashboardSummary = vi.fn();
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

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/components/organisms/dashboard/editPeriod/EditPeriodDrawer", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div>Edit drawer open</div> : null,
}));

function buildSummary(remainingToSpend: number) {
  return {
    header: {
      periodKey: "2026-04",
      periodLabel: "April 2026",
      periodDateRangeLabel: "",
      periodStatus: "open" as const,
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

describe("DashboardContent", () => {
  beforeEach(() => {
    mockUseDashboardSummary.mockReset();
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

  it("confirming without a backend boundary shows an info toast instead of faking success", () => {
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
    fireEvent.click(
      screen.getByRole("button", { name: /close april 2026 anyway/i }),
    );

    expect(mockToast.info).toHaveBeenCalledWith(
      "Month closing will be enabled soon.",
      expect.objectContaining({
        id: "dashboard:close-month:2026-04:coming-soon",
      }),
    );

    expect(mockToast.success).not.toHaveBeenCalled();

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
    fireEvent.click(
      screen.getByRole("button", { name: /review income & expenses/i }),
    );

    expect(
      screen.queryByRole("heading", { name: "Ready to lock in April 2026?" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Edit drawer open")).toBeInTheDocument();
  });

  it("calls the provided close-month boundary with yearMonth, summary, and reviewState, then closes the modal", async () => {
    mockUseDashboardSummary.mockReturnValue(readyResult);

    const onRequestCloseMonth = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <DashboardContent
          isFirstTimeLogin={false}
          isWizardOpen={false}
          setIsWizardOpen={vi.fn()}
          onRequestCloseMonth={onRequestCloseMonth}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /close month/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /close april 2026 anyway/i }),
    );

    await waitFor(() => {
      expect(onRequestCloseMonth).toHaveBeenCalledWith({
        yearMonth: "2026-04",
        summary: expect.objectContaining({
          header: expect.objectContaining({
            periodKey: "2026-04",
            periodLabel: "April 2026",
          }),
        }),
        reviewState: expect.objectContaining({
          state: "positiveRemaining",
          normalizedRemainingToSpend: 245,
        }),
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Ready to lock in April 2026?" }),
      ).not.toBeInTheDocument();
    });

    expect(mockToast.info).not.toHaveBeenCalled();
  });
});
