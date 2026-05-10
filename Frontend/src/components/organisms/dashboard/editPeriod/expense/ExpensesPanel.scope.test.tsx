import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExpensesPanel from "./ExpensesPanel";

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
const baselineRowId = "22222222-2222-4222-8222-222222222222";
const monthOnlyRowId = "44444444-4444-4444-8444-444444444444";

function buildEditorData() {
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
        id: baselineRowId,
        sourceExpenseItemId: "33333333-3333-3333-3333-333333333333",
        categoryId: subscriptionCategoryId,
        name: "Netflix",
        amountMonthly: 129,
        subscriptionLifecycleStatus: "active" as const,
        isActive: true,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: true,
      },
      {
        id: monthOnlyRowId,
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

function renderPanel() {
  mockUseBudgetMonthEditor.mockReturnValue({
    data: buildEditorData(),
    isLoading: false,
    isError: false,
  });
  mockUseExpenseCategories.mockReturnValue({
    data: [
      { id: subscriptionCategoryId, name: "Subscription", code: "subscription" },
      { id: foodCategoryId, name: "Food", code: "food" },
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
      <ExpensesPanel
        open
        yearMonth="2026-04"
        periodLabel="April 2026"
        onClose={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("ExpensesPanel scope toggle", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUsePatchBudgetMonthExpenseItemsBulk.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("sends updateDefault=false by default for changed rows", async () => {
    mockMutateAsync.mockResolvedValue([]);
    renderPanel();

    fireEvent.click(screen.getByRole("radio", { name: "Paused" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg).toHaveLength(1);
    expect(callArg[0].monthExpenseItemId).toBe(baselineRowId);
    expect(callArg[0].payload.updateDefault).toBe(false);
  });

  it("sends updateDefault=true for baseline-backed rows when scope=plan", async () => {
    mockMutateAsync.mockResolvedValue([]);
    renderPanel();

    // Trigger a change on the baseline-backed (subscription) row.
    fireEvent.click(screen.getByRole("radio", { name: "Paused" }));

    // Switch the scope toggle to "plan".
    fireEvent.click(
      screen.getByRole("radio", { name: /Update the ongoing budget plan/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg).toHaveLength(1);
    expect(callArg[0].monthExpenseItemId).toBe(baselineRowId);
    expect(callArg[0].payload.updateDefault).toBe(true);
  });
});
