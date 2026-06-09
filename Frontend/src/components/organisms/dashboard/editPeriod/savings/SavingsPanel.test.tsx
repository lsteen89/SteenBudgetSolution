import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";

import SavingsPanel from "./SavingsPanel";

const mockUseBudgetMonthSavingsGoals = vi.fn();
const mockUsePatchBudgetMonthBaseSavings = vi.fn();
const mockUsePatchBudgetMonthSavingsGoalsBulk = vi.fn();
const mockPatchBaseSavings = vi.fn();
const mockPatchGoals = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthSavingsGoals: (...args: unknown[]) =>
    mockUseBudgetMonthSavingsGoals(...args),
  usePatchBudgetMonthBaseSavings: (...args: unknown[]) =>
    mockUsePatchBudgetMonthBaseSavings(...args),
  usePatchBudgetMonthSavingsGoalsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthSavingsGoalsBulk(...args),
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

const savingsGoalId = "77777777-7777-4777-8777-777777777777";

const PROJECTION_TERMS: DashboardTerms = {
  income: 30000,
  carryOver: 500,
  expenses: 18000,
  savings: 4000,
  debts: 2000,
  remaining: 6500,
};

function buildSavingsGoal(overrides: Partial<{
  id: string;
  monthlyContribution: number;
  status: "active" | "closed";
}> = {}) {
  return {
    id: overrides.id ?? savingsGoalId,
    sourceSavingsGoalId: "88888888-8888-4888-8888-888888888888",
    name: "Emergency fund",
    targetAmount: 50000,
    targetDate: "2026-12-31",
    amountSaved: 10000,
    monthlyContribution: overrides.monthlyContribution ?? 1500,
    status: overrides.status ?? "active",
    isDeleted: false,
    isMonthOnly: false,
    canUpdateDefault: true,
  };
}

type RenderOptions = {
  dashboardSavings?: {
    baseSavingsMonthly: number;
    isMonthOnly: boolean;
  };
  readOnly?: boolean;
  goals?: ReturnType<typeof buildSavingsGoal>[];
  onClose?: () => void;
};

function renderPanel(options: RenderOptions = {}) {
  mockUseBudgetMonthSavingsGoals.mockReturnValue({
    data: options.goals ?? [buildSavingsGoal()],
    isLoading: false,
    isError: false,
  });
  mockUsePatchBudgetMonthBaseSavings.mockReturnValue({
    mutateAsync: mockPatchBaseSavings,
    isPending: false,
  });
  mockUsePatchBudgetMonthSavingsGoalsBulk.mockReturnValue({
    mutateAsync: mockPatchGoals,
    isPending: false,
  });

  const onClose = options.onClose ?? vi.fn();

  render(
    <MemoryRouter>
      <SavingsPanel
        open
        yearMonth="2026-04"
        periodLabel="April 2026"
        onClose={onClose}
        dashboardTerms={PROJECTION_TERMS}
        currency="SEK"
        dashboardSavings={
          options.dashboardSavings
            ? {
                ...options.dashboardSavings,
                readOnly: options.readOnly ?? false,
              }
            : undefined
        }
      />
    </MemoryRouter>,
  );

  return { onClose };
}

describe("SavingsPanel PR E base savings reconciliation", () => {
  beforeEach(() => {
    mockUseBudgetMonthSavingsGoals.mockReset();
    mockUsePatchBudgetMonthBaseSavings.mockReset();
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReset();
    mockPatchBaseSavings.mockReset();
    mockPatchGoals.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("renders the base savings row only when dashboard savings is provided", () => {
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: false,
        readOnly: false,
      },
    });

    expect(screen.getByTestId("period-savings-base-row")).toBeInTheDocument();
    expect(screen.getAllByText("Base savings").length).toBeGreaterThan(0);

    cleanup();
    renderPanel();

    expect(screen.queryByTestId("period-savings-base-row"))
      .not.toBeInTheDocument();
    expect(screen.getByText("Emergency fund")).toBeInTheDocument();
  });

  it("shows the month-only hint for base savings overrides", () => {
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: true,
        readOnly: false,
      },
    });

    expect(
      screen.getByText("This month has its own base amount."),
    ).toBeInTheDocument();
  });

  it("applies base savings through its own mutation and keeps the drawer open", async () => {
    mockPatchBaseSavings.mockResolvedValue({
      monthlyAmount: 1200,
      isMonthOnly: true,
    });
    const { onClose } = renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: false,
        readOnly: false,
      },
      onClose: vi.fn(),
    });

    const baseRow = screen.getByTestId("period-savings-base-row");
    fireEvent.change(within(baseRow).getByRole("textbox", { name: "Base savings" }), {
      target: { value: "1200" },
    });

    expect(screen.getByTestId("period-savings-base-apply")).not.toBeDisabled();

    fireEvent.click(screen.getByTestId("period-savings-base-apply"));

    await waitFor(() => {
      expect(mockPatchBaseSavings).toHaveBeenCalledWith({
        amountMonthly: 1200,
        scope: "currentMonthOnly",
      });
    });
    expect(mockPatchGoals).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalledWith("All changes saved");
  });

  it("projects dirty base savings without enabling the goal Save button", async () => {
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: false,
        readOnly: false,
      },
    });

    const baseRow = screen.getByTestId("period-savings-base-row");
    fireEvent.change(within(baseRow).getByRole("textbox", { name: "Base savings" }), {
      target: { value: "1200" },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("quick-edit-projection").getAttribute(
          "data-projection-state",
        ),
      ).toBe("changed");
    });

    expect(screen.getByTestId("quick-edit-projection-delta").textContent)
      .toContain("200");
    expect(screen.getByRole("button", { name: "Save changes" }))
      .toBeDisabled();
  });

  it("saves dirty goal contributions through the bulk goals mutation only", async () => {
    mockPatchGoals.mockResolvedValue([]);
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: false,
        readOnly: false,
      },
    });

    const goalRow = screen.getByTestId(`period-savings-row-${savingsGoalId}`);
    fireEvent.change(within(goalRow).getByRole("textbox", { name: "Emergency fund" }), {
      target: { value: "1800" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" }))
        .not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockPatchGoals).toHaveBeenCalledWith([
        {
          monthSavingsGoalId: savingsGoalId,
          payload: {
            monthlyContribution: 1800,
            scope: "currentMonthOnly",
          },
        },
      ]);
    });
    expect(mockPatchBaseSavings).not.toHaveBeenCalled();
  });

  it("validates the base savings input separately from goal Save", () => {
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: false,
        readOnly: false,
      },
    });

    const baseRow = screen.getByTestId("period-savings-base-row");
    fireEvent.change(within(baseRow).getByRole("textbox", { name: "Base savings" }), {
      target: { value: "" },
    });

    expect(within(baseRow).getByRole("alert")).toHaveTextContent(
      "Amount is required",
    );
    expect(screen.getByTestId("period-savings-base-apply")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save changes" }))
      .toBeDisabled();
  });

  it("renders base savings and goals read-only on non-editable months", () => {
    renderPanel({
      dashboardSavings: {
        baseSavingsMonthly: 1000,
        isMonthOnly: true,
        readOnly: true,
      },
      readOnly: true,
    });

    expect(screen.getByTestId("period-savings-base-row")).toBeInTheDocument();
    expect(
      screen.queryByTestId("period-savings-base-apply"),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId(`period-savings-row-${savingsGoalId}`))
        .queryByRole("textbox", { name: "Emergency fund" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" }))
      .toBeDisabled();
  });
});
