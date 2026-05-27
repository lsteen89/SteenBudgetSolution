import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavingsEditorPage from "./SavingsEditorPage";

const mockSavingsQuery = vi.fn();
const mockPatchMutateAsync = vi.fn();
const mockCompleteMutateAsync = vi.fn();
const mockRemoveMutateAsync = vi.fn();
const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/budget/useBudgetDashboardMonthQuery", () => ({
  useBudgetDashboardMonthQuery: (...args: unknown[]) =>
    mockUseBudgetDashboardMonthQuery(...args),
}));

vi.mock("@/hooks/dashboard/buildDashboardSummaryAggregate", () => ({
  buildDashboardSummaryAggregate: () => ({
    summary: {
      header: { periodLabel: "May 2026" },
      currency: "SEK",
      remainingToSpend: 1250,
      totalIncome: 30000,
      incomingCarryOverAmount: 500,
      totalExpenditure: 18000,
      habitSavings: 4500,
      totalDebtPayments: 5250,
    },
  }),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthSavingsGoals: () => mockSavingsQuery(),
  useBudgetMonthSavingsOldGoals: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
  useBudgetMonthSavingsMethods: () => ({
    isLoading: false,
    isError: false,
    data: [],
  }),
  useCreateBudgetMonthSavingsGoal: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthSavingsGoal: () => ({
    mutateAsync: mockPatchMutateAsync,
    isPending: false,
  }),
  useCompleteSavingsGoalMutation: () => ({
    mutateAsync: mockCompleteMutateAsync,
    isPending: false,
  }),
  useCancelSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveSavingsGoalMutation: () => ({
    mutateAsync: mockRemoveMutateAsync,
    isPending: false,
  }),
  useAddBudgetMonthSavingsMethod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveBudgetMonthSavingsMethod: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePatchBudgetMonthBaseSavings: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useTransferBudgetMonthSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const linkedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  targetDate: "2030-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));

  mockSavingsQuery.mockReturnValue({
    isLoading: false,
    isError: false,
    data: [linkedRow],
  });
  mockUseBudgetMonthsStatusQuery.mockReturnValue({
    isLoading: false,
    data: {
      openMonthYearMonth: "2026-05",
      months: [{ yearMonth: "2026-05", status: "open" }],
    },
  });
  mockUseBudgetDashboardMonthQuery.mockReturnValue({
    isLoading: false,
    data: { whatever: true },
  });
  mockPatchMutateAsync.mockReset().mockResolvedValue({});
  mockCompleteMutateAsync.mockReset().mockResolvedValue({});
  mockRemoveMutateAsync.mockReset().mockResolvedValue({});
  mockToast.success.mockReset();
  mockToast.error.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SavingsEditorPage goal actions", () => {
  it("saves Månadsbelopp with monthlyContribution and scope only", async () => {
    vi.useRealTimers();
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: /monthly amount/i }));
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockPatchMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockPatchMutateAsync).toHaveBeenCalledWith({
      monthSavingsGoalId: linkedRow.id,
      payload: {
        monthlyContribution: 2200,
        scope: "currentMonthOnly",
      },
    });
    expect(mockPatchMutateAsync.mock.calls[0][0].payload).not.toHaveProperty(
      "targetDate",
    );
  });

  it("saves Måldatum in recalcMonthly mode with recomputed monthlyContribution", async () => {
    vi.useRealTimers();
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: /target date/i }));
    fireEvent.change(screen.getByLabelText("New target date"), {
      target: { value: "2027-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(mockPatchMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockPatchMutateAsync).toHaveBeenCalledWith({
      monthSavingsGoalId: linkedRow.id,
      payload: {
        monthlyContribution: 3334,
        targetDate: "2027-05-01",
        scope: "currentMonthAndBudgetPlan",
      },
    });
  });

  it("saves Måldatum in keepMonthly mode with unchanged monthlyContribution", async () => {
    vi.useRealTimers();
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: /target date/i }));
    fireEvent.change(screen.getByLabelText("New target date"), {
      target: { value: "2027-05" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /keep monthly amount/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(mockPatchMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockPatchMutateAsync).toHaveBeenCalledWith({
      monthSavingsGoalId: linkedRow.id,
      payload: {
        monthlyContribution: 1500,
        targetDate: "2027-05-01",
        scope: "currentMonthAndBudgetPlan",
      },
    });
  });

  it("archives a goal through the kebab confirm dialog", async () => {
    vi.useRealTimers();
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /archive goal/i }));
    fireEvent.click(screen.getByRole("button", { name: /mark as completed/i }));

    await waitFor(() => expect(mockCompleteMutateAsync).toHaveBeenCalledWith(linkedRow.id));
  });

  it("removes a goal through the kebab confirm dialog", async () => {
    vi.useRealTimers();
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: /more/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /remove goal/i }));
    fireEvent.click(screen.getByRole("button", { name: /^remove$/i }));

    await waitFor(() => expect(mockRemoveMutateAsync).toHaveBeenCalledWith(linkedRow.id));
  });
});
