import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditPeriodDrawer from "./EditPeriodDrawer";

const mockUseBudgetMonthEditor = vi.fn();
const mockUsePatchBudgetMonthExpenseItemsBulk = vi.fn();
const mockUseExpenseCategories = vi.fn();
const mockMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) => mockUseBudgetMonthEditor(...args),
  usePatchBudgetMonthExpenseItemsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthExpenseItemsBulk(...args),
}));

vi.mock("@/hooks/budget/useExpenseCategories", () => ({
  useExpenseCategories: (...args: unknown[]) => mockUseExpenseCategories(...args),
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

const subscriptionCategoryId = "9a3fe5f3-9fc4-4cc0-93d9-1a2ab9f7a5c4";
const foodCategoryId = "5d5c51aa-9f05-4d4c-8ff1-0a61d6c9cc10";
const subscriptionRowId = "22222222-2222-4222-8222-222222222222";
const foodRowId = "44444444-4444-4444-8444-444444444444";

function buildEditorData(subscriptionLifecycleStatus: "active" | "paused" | "cancelled" = "active") {
  return {
    month: {
      budgetMonthId: "11111111-1111-1111-1111-111111111111",
      yearMonth: "2026-04",
      status: "open",
      isEditable: true,
      carryOverAmount: null,
      carryOverMode: "none",
    },
    expenseItems: [
      {
        id: subscriptionRowId,
        sourceExpenseItemId: "33333333-3333-3333-3333-333333333333",
        categoryId: subscriptionCategoryId,
        name: "Netflix",
        amountMonthly: 129,
        subscriptionLifecycleStatus,
        isActive: true,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: true,
      },
      {
        id: foodRowId,
        sourceExpenseItemId: null,
        categoryId: foodCategoryId,
        name: "Groceries",
        amountMonthly: 250,
        subscriptionLifecycleStatus: null,
        isActive: true,
        isDeleted: false,
        isMonthOnly: true,
        canUpdateDefault: false,
      },
    ],
  };
}

function renderDrawer(subscriptionLifecycleStatus: "active" | "paused" | "cancelled" = "active") {
  mockUseBudgetMonthEditor.mockReturnValue({
    data: buildEditorData(subscriptionLifecycleStatus),
    isLoading: false,
    isError: false,
  });
  mockUseExpenseCategories.mockReturnValue({
    data: [
      {
        id: subscriptionCategoryId,
        name: "Subscription",
        code: "subscription",
      },
      {
        id: foodCategoryId,
        name: "Food",
        code: "food",
      },
    ],
    isLoading: false,
    isError: false,
  });
  mockUsePatchBudgetMonthExpenseItemsBulk.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });

  render(
    <MemoryRouter>
      <EditPeriodDrawer
        open
        yearMonth="2026-04"
        periodLabel="April 2026"
        periodDateRangeLabel="Apr 1 - Apr 30"
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("EditPeriodDrawer subscription lifecycle", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUsePatchBudgetMonthExpenseItemsBulk.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("shows lifecycle controls for subscription rows", () => {
    renderDrawer();

    const subscriptionRow = screen.getByTestId(
      `period-expense-row-${subscriptionRowId}`,
    );

    expect(
      within(subscriptionRow).getByRole("radiogroup", {
        name: "Subscription status",
      }),
    ).toBeInTheDocument();
    expect(within(subscriptionRow).getByRole("radio", { name: "Active" }))
      .toHaveAttribute("aria-checked", "true");
  });

  it("does not show lifecycle controls for non-subscription rows", () => {
    renderDrawer();

    const foodRow = screen.getByTestId(
      `period-expense-row-${foodRowId}`,
    );

    expect(
      within(foodRow).queryByRole("radiogroup", {
        name: "Subscription status",
      }),
    ).toBeNull();
  });

  it("shows not-counted copy for paused and cancelled subscriptions", () => {
    renderDrawer("paused");

    expect(screen.getByText("Not counted this month")).toBeInTheDocument();

    renderDrawer("cancelled");

    expect(screen.getAllByText("Not counted this month")).toHaveLength(2);
  });

  it("sends lifecycle status in the patch payload", async () => {
    mockMutateAsync.mockResolvedValue(undefined);
    renderDrawer();

    fireEvent.click(screen.getByRole("radio", { name: "Paused" }));
    expect(screen.getByText("Not counted this month")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith([
        {
          monthExpenseItemId: subscriptionRowId,
          payload: {
            name: "Netflix",
            categoryId: subscriptionCategoryId,
            amountMonthly: 129,
            isActive: true,
            subscriptionLifecycleStatus: "paused",
            updateDefault: false,
          },
        },
      ]);
    });
  });
});
