import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavingsEditorPage from "./SavingsEditorPage";

const mockSavingsQuery = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockPatchMutateAsync = vi.fn();
const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };
const mockCreateIsPending = { current: false };

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
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
    mutateAsync: mockCreateMutateAsync,
    get isPending() {
      return mockCreateIsPending.current;
    },
  }),
  usePatchBudgetMonthSavingsGoal: () => ({
    mutateAsync: mockPatchMutateAsync,
    isPending: false,
  }),
  useCompleteSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useRemoveSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
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
  useRenameBudgetMonthSavingsGoalMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useChangeBudgetMonthSavingsGoalTargetAmountMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const setupMonth = (status: "open" | "closed" | "skipped") => {
  mockUseBudgetMonthsStatusQuery.mockReturnValue({
    isLoading: false,
    data: {
      openMonthYearMonth: status === "open" ? "2026-05" : null,
      months: [{ yearMonth: "2026-05", status }],
    },
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));

  mockSavingsQuery.mockReturnValue({
    isLoading: false,
    isError: false,
    data: [],
  });

  mockUseBudgetDashboardMonthQuery.mockReturnValue({
    isLoading: false,
    data: {},
  });

  mockCreateMutateAsync.mockReset();
  mockPatchMutateAsync.mockReset();
  mockToast.success.mockReset();
  mockToast.error.mockReset();
  mockCreateIsPending.current = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SavingsEditorPage inline create", () => {
  it("renders the enabled placeholder for an open month", () => {
    setupMonth("open");
    render(<SavingsEditorPage />);

    const placeholder = screen.getByTestId("savings-goal-add-placeholder");
    expect(placeholder.getAttribute("data-state")).toBe("ready");
  });

  it.each([["closed"], ["skipped"]] as const)(
    "does not expose a create affordance when the only month is %s",
    (status) => {
      setupMonth(status);
      render(<SavingsEditorPage />);

      expect(
        screen.queryByTestId("savings-goal-add-placeholder"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("savings-goal-draft-card"),
      ).not.toBeInTheDocument();
    },
  );

  it("opens the draft card when the placeholder is clicked", () => {
    setupMonth("open");
    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByTestId("savings-goal-add-placeholder"));

    expect(screen.getByTestId("savings-goal-draft-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("savings-goal-add-placeholder"),
    ).not.toBeInTheDocument();
  });

  it("submits the create mutation with the computed monthly contribution", async () => {
    setupMonth("open");
    mockCreateMutateAsync.mockResolvedValue({});
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));

    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByTestId("savings-goal-add-placeholder"));

    fireEvent.change(screen.getByLabelText(/What are you saving for/i), {
      target: { value: "Iceland" },
    });
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "12000" },
    });
    fireEvent.change(screen.getByLabelText(/Target date/i), {
      target: { value: "2027-05-19" },
    });

    fireEvent.click(screen.getByTestId("savings-draft-submit"));

    await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1));
    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      name: "Iceland",
      targetAmount: 12000,
      targetDate: "2027-05-19",
      amountSaved: null,
      monthlyContribution: 1000,
    });
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByTestId("savings-goal-draft-card")).not.toBeInTheDocument(),
    );
  });

  // Regression guard for the PR 2.8 Bug A typo class: `isMonthOnly` was read
  // from the wrong dashboard path so the orphan dialog never disabled
  // plan-scope cards on first open. If the consumer path regresses
  // (e.g. someone re-introduces `data?.savings?.isMonthOnly` shorthand),
  // both asserts below flip.
  it("disables plan-scope cards in the Bassparande dialog when the open month is orphan", () => {
    setupMonth("open");
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      isLoading: false,
      data: {
        liveDashboard: {
          savings: {
            monthlySavings: 1500,
            totalGoalSavingsMonthly: 0,
            totalSavingsMonthly: 1500,
            isMonthOnly: true,
            goals: [],
          },
        },
      },
    });

    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByTestId("savings-base-habit-edit-action"));

    expect(
      screen.getByTestId("savings-base-habit-scope-currentMonthOnly"),
    ).toBeEnabled();
    expect(
      screen.getByTestId("savings-base-habit-scope-currentMonthAndBudgetPlan"),
    ).toBeDisabled();
    expect(
      screen.getByTestId("savings-base-habit-scope-budgetPlanOnly"),
    ).toBeDisabled();
  });

  it("enables every scope card in the Bassparande dialog when the open month is plan-linked", () => {
    setupMonth("open");
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      isLoading: false,
      data: {
        liveDashboard: {
          savings: {
            monthlySavings: 1500,
            totalGoalSavingsMonthly: 0,
            totalSavingsMonthly: 1500,
            isMonthOnly: false,
            goals: [],
          },
        },
      },
    });

    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByTestId("savings-base-habit-edit-action"));

    expect(
      screen.getByTestId("savings-base-habit-scope-currentMonthOnly"),
    ).toBeEnabled();
    expect(
      screen.getByTestId("savings-base-habit-scope-currentMonthAndBudgetPlan"),
    ).toBeEnabled();
    expect(
      screen.getByTestId("savings-base-habit-scope-budgetPlanOnly"),
    ).toBeEnabled();
  });

  it("keeps the draft visible and surfaces an inline error when the mutation fails", async () => {
    setupMonth("open");
    mockCreateMutateAsync.mockRejectedValue(new Error("boom"));
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));

    render(<SavingsEditorPage />);

    fireEvent.click(screen.getByTestId("savings-goal-add-placeholder"));
    fireEvent.change(screen.getByLabelText(/What are you saving for/i), {
      target: { value: "Iceland" },
    });
    fireEvent.change(screen.getByLabelText(/Target amount/i), {
      target: { value: "12000" },
    });
    fireEvent.change(screen.getByLabelText(/Target date/i), {
      target: { value: "2027-05-19" },
    });
    fireEvent.click(screen.getByTestId("savings-draft-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("savings-draft-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("savings-goal-draft-card")).toBeInTheDocument();
    expect(
      (screen.getByLabelText(/What are you saving for/i) as HTMLInputElement)
        .value,
    ).toBe("Iceland");
    expect(mockToast.success).not.toHaveBeenCalled();
  });
});
