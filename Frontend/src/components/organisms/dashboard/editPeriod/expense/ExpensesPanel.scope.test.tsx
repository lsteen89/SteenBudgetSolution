import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ExpensesPanel from "./ExpensesPanel";

const mockUseBudgetMonthEditor = vi.fn();
const mockUsePatchBudgetMonthExpenseItemsBulk = vi.fn();
const mockUseCreateBudgetMonthExpenseItem = vi.fn();
const mockUseExpenseCategories = vi.fn();
const mockMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) => mockUseBudgetMonthEditor(...args),
  usePatchBudgetMonthExpenseItemsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthExpenseItemsBulk(...args),
  useCreateBudgetMonthExpenseItem: (...args: unknown[]) =>
    mockUseCreateBudgetMonthExpenseItem(...args),
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
const housingCategoryId = "2a9a1038-6ff1-4f2b-bd73-f2b9bb3f4c21";
const baselineRowId = "22222222-2222-4222-8222-222222222222";
const monthOnlyRowId = "44444444-4444-4444-8444-444444444444";
const housingRowId = "55555555-5555-4555-8555-555555555555";
const cancelledSubRowId = "66666666-6666-4666-8666-666666666666";

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

type RenderOptions = {
  editorData?: ReturnType<typeof buildEditorData>;
  categories?: Array<{ id: string; name: string; code: string }>;
};

function renderPanel(options: RenderOptions = {}) {
  mockUseBudgetMonthEditor.mockReturnValue({
    data: options.editorData ?? buildEditorData(),
    isLoading: false,
    isError: false,
  });
  mockUseExpenseCategories.mockReturnValue({
    data: options.categories ?? [
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
  mockUseCreateBudgetMonthExpenseItem.mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
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

describe("ExpensesPanel month-only drawer scope", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUsePatchBudgetMonthExpenseItemsBulk.mockReset();
    mockUseCreateBudgetMonthExpenseItem.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockCreateMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("does not expose a future-budget scope selector in the quick drawer", () => {
    renderPanel();

    expect(
      screen.getByText(
        "Changes here apply only to April 2026. Want to update the budget plan going forward? Open planning.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("radiogroup", {
        name: /what should this change apply to/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("sends updateDefault=false for changed rows", async () => {
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
    expect(callArg[0].payload.scope).toBe("currentMonthOnly");
  });

  it("renders housing rows in the Expenses tab (PR C: no longer excluded)", () => {
    const editorData = buildEditorData();
    editorData.expenseItems.push({
      id: housingRowId,
      sourceExpenseItemId: "77777777-7777-7777-7777-777777777777",
      categoryId: housingCategoryId,
      name: "Rent",
      amountMonthly: 8000,
      subscriptionLifecycleStatus: null,
      isActive: true,
      isDeleted: false,
      isMonthOnly: false,
      canUpdateDefault: true,
    } as (typeof editorData.expenseItems)[number]);

    renderPanel({
      editorData,
      categories: [
        { id: housingCategoryId, name: "Housing", code: "housing" },
        { id: subscriptionCategoryId, name: "Subscription", code: "subscription" },
        { id: foodCategoryId, name: "Food", code: "food" },
      ],
    });

    // Housing group renders with its row visible.
    expect(screen.getByTestId("expense-group-housing")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(
      screen.getByTestId(`period-expense-row-${housingRowId}`),
    ).toBeInTheDocument();
  });

  it("counts a cancelled subscription as a draft delta (last charge this month)", async () => {
    mockMutateAsync.mockResolvedValue([]);
    renderPanel();

    // Netflix starts as active (counts: 129). User marks it cancelled.
    // Cancelled subscriptions count this month (last charge), so the draft
    // total should NOT drop — and the row's amount input should remain
    // editable. A "last charge this month" banner is rendered.
    fireEvent.click(screen.getByRole("radio", { name: "Cancelled" }));

    expect(
      await screen.findByTestId(`subscription-last-charge-${baselineRowId}`),
    ).toBeInTheDocument();

    // The amount input remains enabled (cancelled rows still have a
    // last-charge amount the user may want to edit).
    const netflixRow = screen.getByTestId(`period-expense-row-${baselineRowId}`);
    const amountInput = within(netflixRow).getByRole("textbox");
    expect(amountInput).not.toBeDisabled();

    // Save still becomes enabled because the lifecycle status changed.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    const callArg = mockMutateAsync.mock.calls[0][0];
    expect(callArg[0].monthExpenseItemId).toBe(baselineRowId);
    expect(callArg[0].payload.subscriptionLifecycleStatus).toBe("cancelled");
  });

  it("paused subscription drops to 0 for the month (still excluded)", () => {
    renderPanel();

    // Mark Netflix as paused. The row should show 'Not counted this month'
    // and the amount input should be disabled.
    fireEvent.click(screen.getByRole("radio", { name: "Paused" }));

    expect(screen.getByText("Not counted this month")).toBeInTheDocument();

    const netflixRow = screen.getByTestId(`period-expense-row-${baselineRowId}`);
    const amountInput = within(netflixRow).getByRole("textbox");
    expect(amountInput).toBeDisabled();
  });

  it("offers inline 'Add to ...' per group on editable months", () => {
    renderPanel();

    // Both rendered groups (subscription + food) expose an add affordance.
    expect(
      screen.getByTestId("expense-group-add-subscription"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("expense-group-add-food"),
    ).toBeInTheDocument();
  });

  it("inline create writes only to the clicked category (currentMonthOnly)", async () => {
    mockCreateMutateAsync.mockResolvedValue(undefined);
    renderPanel();

    // Open the inline create form for Food, fill it, submit.
    fireEvent.click(screen.getByTestId("expense-group-add-food"));

    const nameInput = await screen.findByPlaceholderText("New expense name");
    fireEvent.change(nameInput, { target: { value: "Pizza Friday" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "150" } });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateMutateAsync.mock.calls[0][0];
    expect(payload.categoryId).toBe(foodCategoryId);
    expect(payload.name).toBe("Pizza Friday");
    expect(payload.amountMonthly).toBe(150);
    // Non-subscription category — lifecycle stays null.
    expect(payload.subscriptionLifecycleStatus).toBeNull();
  });

  it("inline create for subscription category defaults lifecycle to active", async () => {
    mockCreateMutateAsync.mockResolvedValue(undefined);
    renderPanel();

    fireEvent.click(screen.getByTestId("expense-group-add-subscription"));

    const nameInput = await screen.findByPlaceholderText("New expense name");
    fireEvent.change(nameInput, { target: { value: "Disney+" } });

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "99" } });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockCreateMutateAsync.mock.calls[0][0];
    expect(payload.categoryId).toBe(subscriptionCategoryId);
    expect(payload.subscriptionLifecycleStatus).toBe("active");
  });

  it("preserves user-typed amount when switching a subscription to cancelled (regression: v2 fix #2)", () => {
    // Bug before v2: handleSubscriptionLifecycleChange unconditionally reset
    // the draft amount to the row's persisted value on every lifecycle
    // change. Typing a last-charge amount on a cancelled sub silently
    // reverted to the original monthly amount the moment the user clicked
    // "Cancelled".
    renderPanel();

    const netflixRow = screen.getByTestId(`period-expense-row-${baselineRowId}`);
    const amountInput = within(netflixRow).getByRole("textbox");

    // User types a partial last-charge amount BEFORE marking the row
    // cancelled — a realistic order of operations.
    fireEvent.change(amountInput, { target: { value: "50" } });

    fireEvent.click(screen.getByRole("radio", { name: "Cancelled" }));

    // The amount the user typed must survive the lifecycle transition.
    const amountInputAfter = within(netflixRow).getByRole("textbox");
    expect(amountInputAfter).toHaveValue("50");
  });

  it("preserves dirty drafts across an inline-create-triggered refetch (regression: v2 fix #1)", async () => {
    // Bug before v2: the seed useEffect rebuilt `drafts` from scratch on
    // every `editor` change. An inline create invalidated the editor
    // query, the refetch landed a new row set, and any unsaved edits the
    // user had typed in other rows vanished.
    //
    // The mock here simulates the refetch by mutating the editor mock's
    // return value inside `mockCreateMutateAsync` — when React re-renders
    // after the mutation closes the inline form, the new editor data is
    // returned by `useBudgetMonthEditor` and the useEffect fires.
    const newSubRowId = "88888888-8888-4888-8888-888888888888";
    mockCreateMutateAsync.mockImplementation(async () => {
      const updated = buildEditorData();
      updated.expenseItems.push({
        id: newSubRowId,
        sourceExpenseItemId: null,
        categoryId: subscriptionCategoryId,
        name: "Disney+",
        amountMonthly: 99,
        subscriptionLifecycleStatus: "active" as const,
        isActive: true,
        isDeleted: false,
        isMonthOnly: true,
        canUpdateDefault: false,
      } as (typeof updated.expenseItems)[number]);

      mockUseBudgetMonthEditor.mockReturnValue({
        data: updated,
        isLoading: false,
        isError: false,
      });
      return undefined;
    });

    renderPanel();

    // User dirties the Groceries amount before deciding to add a new sub.
    const groceriesRow = screen.getByTestId(
      `period-expense-row-${monthOnlyRowId}`,
    );
    const groceriesInput = within(groceriesRow).getByRole("textbox");
    fireEvent.change(groceriesInput, { target: { value: "300" } });
    expect(groceriesInput).toHaveValue("300");

    // Open inline create under the subscription group and submit.
    fireEvent.click(screen.getByTestId("expense-group-add-subscription"));

    const nameInput = await screen.findByPlaceholderText("New expense name");
    fireEvent.change(nameInput, { target: { value: "Disney+" } });

    const newAmountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(newAmountInput, { target: { value: "99" } });

    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    // After the inline form closes and the new row appears, the existing
    // Groceries draft must still hold "300", not snap back to "250".
    const groceriesRowAfter = screen.getByTestId(
      `period-expense-row-${monthOnlyRowId}`,
    );
    const groceriesInputAfter = within(groceriesRowAfter).getByRole("textbox");
    await waitFor(() => {
      expect(groceriesInputAfter).toHaveValue("300");
    });

    // Sanity: the new row landed on the panel.
    expect(
      screen.getByTestId(`period-expense-row-${newSubRowId}`),
    ).toBeInTheDocument();
  });

  it("discards unsaved drafts when the drawer closes and reopens (regression: v3 fix #4)", () => {
    // Bug after v2 fix #1: the seed effect only merged, never reseeded.
    // ExpensesPanel stays mounted across drawer close/reopen (the Quick
    // Edit tab shell keeps panels mounted so drafts persist across tab
    // switches). With merge-only semantics, a Cancel + reopen cycle
    // silently reused the user's stale unsaved values instead of
    // restarting from the server's source of truth.
    //
    // v3 fix: a dedicated `open=false` effect clears `drafts` (and the
    // inline-create UI) the moment the drawer closes, so the next open
    // seeds from the server with `prev = {}`.
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
    mockUseCreateBudgetMonthExpenseItem.mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: false,
    });

    const { rerender } = render(
      <MemoryRouter>
        <ExpensesPanel
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // User dirties the Groceries amount from "250" to "300".
    const groceriesRow = screen.getByTestId(
      `period-expense-row-${monthOnlyRowId}`,
    );
    const groceriesInput = within(groceriesRow).getByRole("textbox");
    fireEvent.change(groceriesInput, { target: { value: "300" } });
    expect(groceriesInput).toHaveValue("300");

    // User cancels — the drawer goes to `open=false` while the panel
    // stays mounted (the tab shell does not unmount panels).
    rerender(
      <MemoryRouter>
        <ExpensesPanel
          open={false}
          yearMonth="2026-04"
          periodLabel="April 2026"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // User reopens the drawer.
    rerender(
      <MemoryRouter>
        <ExpensesPanel
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // The Groceries draft must NOT preserve the stale "300" — the panel
    // reseeds from the server's persisted "250".
    const groceriesRowAfter = screen.getByTestId(
      `period-expense-row-${monthOnlyRowId}`,
    );
    const groceriesInputAfter = within(groceriesRowAfter).getByRole("textbox");
    expect(groceriesInputAfter).toHaveValue("250");
  });

  it("hides inline add affordances on read-only months", () => {
    const editorData = buildEditorData();
    editorData.month = {
      ...editorData.month,
      status: "closed",
      isEditable: false,
    };

    renderPanel({ editorData });

    expect(
      screen.queryByTestId("expense-group-add-food"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("expense-group-add-subscription"),
    ).not.toBeInTheDocument();
  });
});
