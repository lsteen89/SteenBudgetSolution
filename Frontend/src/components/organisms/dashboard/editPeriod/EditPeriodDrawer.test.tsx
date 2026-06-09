import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardTerms } from "@/domain/budget/dashboardTerms";

import EditPeriodDrawer from "./EditPeriodDrawer";

const PROJECTION_TERMS: DashboardTerms = {
  income: 30000,
  carryOver: 500,
  expenses: 18000,
  savings: 4000,
  debts: 2000,
  remaining: 6500,
};

const mockUseBudgetMonthEditor = vi.fn();
const mockUsePatchBudgetMonthExpenseItemsBulk = vi.fn();
const mockUseBudgetMonthIncomeItems = vi.fn();
const mockUsePatchBudgetMonthIncomeItemsBulk = vi.fn();
const mockUseBudgetMonthSavingsGoals = vi.fn();
const mockUsePatchBudgetMonthSavingsGoalsBulk = vi.fn();
const mockUseBudgetMonthDebts = vi.fn();
const mockUseBudgetMonthDebtEditor = vi.fn();
const mockUsePatchBudgetMonthDebtsBulk = vi.fn();
const mockUseExpenseCategories = vi.fn();
const mockMutateAsync = vi.fn();
const mockIncomeMutateAsync = vi.fn();
const mockSavingsMutateAsync = vi.fn();
const mockDebtsMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) => mockUseBudgetMonthEditor(...args),
  usePatchBudgetMonthExpenseItemsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthExpenseItemsBulk(...args),
  // PR C: ExpensesPanel now opens an inline create form per category group.
  // The drawer-level test doesn't exercise it, but the hook must still be
  // mocked so the panel can mount without ReferenceError.
  useCreateBudgetMonthExpenseItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBudgetMonthIncomeItems: (...args: unknown[]) =>
    mockUseBudgetMonthIncomeItems(...args),
  usePatchBudgetMonthIncomeItemsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthIncomeItemsBulk(...args),
  // PR D: IncomePanel exposes inline create for non-salary groups. The
  // drawer-level test does not exercise it, but the hook must still be
  // mocked so the panel can mount without ReferenceError.
  useCreateBudgetMonthIncomeItem: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useBudgetMonthSavingsGoals: (...args: unknown[]) =>
    mockUseBudgetMonthSavingsGoals(...args),
  usePatchBudgetMonthSavingsGoalsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthSavingsGoalsBulk(...args),
  useBudgetMonthDebts: (...args: unknown[]) =>
    mockUseBudgetMonthDebts(...args),
  // PR F: DebtsPanel now reads the rich `debt-editor` model. The legacy
  // `useBudgetMonthDebts` mock is kept so unrelated callers (and the
  // safety net of "panel never touches it" assertions) don't regress.
  useBudgetMonthDebtEditor: (...args: unknown[]) =>
    mockUseBudgetMonthDebtEditor(...args),
  usePatchBudgetMonthDebtsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthDebtsBulk(...args),
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

/**
 * Minimal `BudgetMonthDebtEditorDto` shape for PR F. The panel only reads
 * `isReadOnly`, `summary.includedMonthlyPaymentTotal`, and a per-row subset
 * (`group`, `actions.canEditPayment`, `monthlyPayment`, `balance`,
 * `minPayment`, `paymentBreakdown.coversInterestAndFees`). The other DTO
 * fields are filled with safe defaults so TypeScript inference inside the
 * panel keeps working without forcing us to construct the full hero/events
 * payload in every test.
 */
function buildDebtEditorRow(
  overrides: {
    id: string;
    name: string;
    monthlyPayment: number;
    balance: number;
    apr?: number;
    monthlyFee?: number | null;
    minPayment?: number | null;
    canEditPayment?: boolean;
    coversInterestAndFees?: boolean;
    group?: "active" | "skipped" | "paid" | "archived";
  },
) {
  const {
    id,
    name,
    monthlyPayment,
    balance,
    apr = 0,
    monthlyFee = null,
    minPayment = null,
    canEditPayment = true,
    coversInterestAndFees = true,
    group = "active",
  } = overrides;
  // The backend snapshot fields (paymentBreakdown.*) are still populated
  // because the DTO requires them, but PR F derives the dirty-edit
  // coversInterestAndFees advisory from `calcDebtPaymentBreakdown` against
  // `row.apr`/`row.monthlyFee`/`row.balance` — the snapshot is stale by
  // definition before save. Tests that exercise the advisory must set
  // realistic apr/balance so the client-side math actually matches the
  // intent of the test.
  return {
    id,
    sourceDebtId: null,
    name,
    type: "creditCard",
    balance,
    sourceBalance: null,
    apr,
    sourceApr: null,
    monthlyFee,
    sourceMonthlyFee: null,
    minPayment,
    sourceMinPayment: null,
    termMonths: null,
    sourceTermMonths: null,
    monthlyPayment,
    sourceMonthlyPayment: null,
    sourceLifecycleStatus: null,
    participationStatus: group === "active" ? "included" : "notIncluded",
    isMonthOnly: false,
    isRemoved: false,
    sortOrder: 0,
    group,
    progress: null,
    paymentBreakdown: {
      plannedMonthlyPayment: monthlyPayment,
      monthlyInterest: 0,
      monthlyFee: 0,
      principalPayment: monthlyPayment,
      projectedBalanceAfterMonth: Math.max(0, balance - monthlyPayment),
      coversInterestAndFees,
      interestAndFeeShortfall: 0,
    },
    actions: {
      canEditPayment,
      canEditDetails: false,
      canUpdateBalance: false,
      canSkipThisMonth: false,
      canIncludeThisMonth: false,
      canMarkPaidOff: false,
      canArchive: false,
      canRestore: false,
      canRemove: false,
      canUpdatePlan: false,
    },
    disabledReasons: [] as string[],
  };
}

function buildDebtEditorDto(
  rows: ReturnType<typeof buildDebtEditorRow>[],
  options: { isReadOnly?: boolean } = {},
) {
  const includedRows = rows.filter((row) => row.group === "active");
  const includedTotal = includedRows.reduce(
    (sum, row) => sum + row.monthlyPayment,
    0,
  );
  return {
    yearMonth: "2026-04",
    monthStatus: options.isReadOnly ? "closed" : "open",
    isReadOnly: options.isReadOnly ?? false,
    summary: {
      includedMonthlyPaymentTotal: includedTotal,
      notIncludedMonthlyPaymentTotal: 0,
      activeLiabilityBalanceTotal: includedRows.reduce(
        (sum, row) => sum + row.balance,
        0,
      ),
      paidOffBalanceTotal: 0,
      archivedBalanceTotal: 0,
      includedMonthlyInterestTotal: 0,
      includedMonthlyFeeTotal: 0,
      includedPrincipalPaymentTotal: includedTotal,
      projectedActiveLiabilityBalanceAfterMonth: 0,
      includedCount: includedRows.length,
      notIncludedCount: 0,
      paidOffCount: 0,
      archivedCount: 0,
      rowsBelowInterestAndFeesCount: 0,
    },
    rows,
    recentEvents: [] as unknown[],
  };
}

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
    mockUseBudgetMonthIncomeItems.mockReset();
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReset();
    mockUseBudgetMonthSavingsGoals.mockReset();
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReset();
    mockUseBudgetMonthDebts.mockReset();
    mockUseBudgetMonthDebtEditor.mockReset();
    mockUsePatchBudgetMonthDebtsBulk.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockIncomeMutateAsync.mockReset();
    mockSavingsMutateAsync.mockReset();
    mockDebtsMutateAsync.mockReset();
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

  it("distinguishes paused (not counted) from cancelled (last charge) subscriptions", () => {
    // PR C: paused → "Not counted this month" (excluded from the month total).
    //       cancelled → "Last charge this month" (counts as a final charge).
    // The amount input stays editable on cancelled because the user may want
    // to record a different last-charge amount; paused disables the input.
    renderDrawer("paused");

    expect(screen.getByText("Not counted this month")).toBeInTheDocument();
    expect(screen.queryByText("Last charge this month")).not.toBeInTheDocument();

    // Explicit cleanup before the second render so the new tree is the
    // only DOM under test. Without this the previous drawer's "Not counted
    // this month" banner stays mounted and a failing cancelled assertion
    // could be masked by the stale paused banner.
    cleanup();

    renderDrawer("cancelled");

    expect(screen.getByText("Last charge this month")).toBeInTheDocument();
    expect(screen.queryByText("Not counted this month")).not.toBeInTheDocument();
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
            scope: "currentMonthOnly",
          },
        },
      ]);
    });
  });

  it("keeps drawer edits current-month-only and points plan edits to planning", () => {
    renderDrawer();

    expect(screen.getByRole("heading", { name: "Edit expenses" }))
      .toBeInTheDocument();
    expect(screen.getByText("Quick adjustment for April 2026"))
      .toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: "Open planning" }),
    ).toBeInTheDocument();
  });

  it("renders the income panel when requested", () => {
    // PR D: IncomePanel resolves `readOnly` from the month meta, so the
    // editor query has to be primed alongside the income-items query.
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
      isLoading: false,
      isError: false,
    });
    mockUseBudgetMonthIncomeItems.mockReturnValue({
      data: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          sourceIncomeItemId: "66666666-6666-4666-8666-666666666666",
          kind: "sideHustle",
          name: "Consulting",
          amountMonthly: 1500,
          isActive: true,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
      mutateAsync: mockIncomeMutateAsync,
      isPending: false,
    });

    render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="income"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Edit income")).toBeInTheDocument();
    expect(screen.getByText("Consulting")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quick adjustments only affect April 2026. Want to change the budget plan going forward? Open planning.",
      ),
    ).toBeInTheDocument();
    // PR D adds an active/inactive toggle to non-salary income rows. The
    // previous "no checkbox" assertion was really checking for plan-scope
    // controls; we keep the radiogroup assertion (scope cards still must
    // not appear in the quick drawer) and drop the incidental checkbox
    // assertion now that the toggle is a legitimate quick-edit affordance.
    expect(
      screen.queryByRole("radiogroup", {
        name: /what should this change apply to/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders the savings panel when requested and saves with currentMonthOnly scope", async () => {
    const savingsRowId = "77777777-7777-4777-8777-777777777777";
    mockUseBudgetMonthSavingsGoals.mockReturnValue({
      data: [
        {
          id: savingsRowId,
          sourceSavingsGoalId: "88888888-8888-4888-8888-888888888888",
          name: "Emergency fund",
          targetAmount: 50000,
          targetDate: "2026-12-31",
          amountSaved: 10000,
          monthlyContribution: 1500,
          status: "active",
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReturnValue({
      mutateAsync: mockSavingsMutateAsync.mockResolvedValue(undefined),
      isPending: false,
    });

    render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="savings"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Edit savings")).toBeInTheDocument();
    expect(screen.getByText("Emergency fund")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quick adjustments only affect April 2026. Want to change the budget plan going forward? Open planning.",
      ),
    ).toBeInTheDocument();
    // Plan scope cards must not appear in the quick drawer
    expect(
      screen.queryByRole("radiogroup", {
        name: /what should this change apply to/i,
      }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Emergency fund"), {
      target: { value: "1800" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockSavingsMutateAsync).toHaveBeenCalledWith([
        {
          monthSavingsGoalId: savingsRowId,
          payload: {
            monthlyContribution: 1800,
            scope: "currentMonthOnly",
          },
        },
      ]);
    });
  });

  it("hides closed savings goals from the savings panel", () => {
    mockUseBudgetMonthSavingsGoals.mockReturnValue({
      data: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          sourceSavingsGoalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          name: "Active goal",
          targetAmount: 1000,
          targetDate: null,
          amountSaved: 0,
          monthlyContribution: 100,
          status: "active",
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          sourceSavingsGoalId: null,
          name: "Already done",
          targetAmount: 1000,
          targetDate: null,
          amountSaved: 1000,
          monthlyContribution: 0,
          status: "closed",
          isDeleted: false,
          isMonthOnly: true,
          canUpdateDefault: false,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReturnValue({
      mutateAsync: mockSavingsMutateAsync,
      isPending: false,
    });

    render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="savings"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Active goal")).toBeInTheDocument();
    expect(screen.queryByText("Already done")).not.toBeInTheDocument();
  });
});

describe("EditPeriodDrawer quick-edit tab shell", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUsePatchBudgetMonthExpenseItemsBulk.mockReset();
    mockUseBudgetMonthIncomeItems.mockReset();
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReset();
    mockUseBudgetMonthSavingsGoals.mockReset();
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReset();
    mockUseBudgetMonthDebts.mockReset();
    mockUseBudgetMonthDebtEditor.mockReset();
    mockUsePatchBudgetMonthDebtsBulk.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockIncomeMutateAsync.mockReset();
    mockSavingsMutateAsync.mockReset();
    mockDebtsMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  function primeAllPanels() {
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
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
    mockUseBudgetMonthIncomeItems.mockReturnValue({
      data: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          sourceIncomeItemId: "66666666-6666-4666-8666-666666666666",
          kind: "sideHustle",
          name: "Consulting",
          amountMonthly: 1500,
          isActive: true,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
      mutateAsync: mockIncomeMutateAsync,
      isPending: false,
    });
    mockUseBudgetMonthSavingsGoals.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReturnValue({
      mutateAsync: mockSavingsMutateAsync,
      isPending: false,
    });
  }

  function renderShell(
    panel: "expenses" | "income" | "savings" | "debts" = "expenses",
  ) {
    return render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel={panel}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
  }

  it("renders all four tabs with the requested one selected", () => {
    primeAllPanels();
    renderShell("expenses");

    expect(
      screen.getByRole("tablist", { name: "Quick editor tabs" }),
    ).toBeInTheDocument();

    expect(screen.getByRole("tab", { name: "Income" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Expenses" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Savings" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Debts" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("makes the active-tab-only save contract explicit in the shell", () => {
    primeAllPanels();
    renderShell("expenses");

    expect(
      screen.getByText(
        "Saving applies to the active tab only. Switch tabs to adjust another area.",
      ),
    ).toBeInTheDocument();
  });

  it("does not mount inactive tab panels until they are visited", () => {
    primeAllPanels();
    renderShell("expenses");

    // Active tab fetches its editor data immediately.
    expect(mockUseBudgetMonthEditor).toHaveBeenCalled();

    // Inactive tabs must not pay the cost of their queries before the user
    // visits them. This is the lazy-load contract for PR A.
    expect(mockUseBudgetMonthIncomeItems).not.toHaveBeenCalled();
    expect(mockUseBudgetMonthSavingsGoals).not.toHaveBeenCalled();
  });

  it("switches the title and mounts the income panel when its tab is clicked", () => {
    primeAllPanels();
    renderShell("expenses");

    expect(
      screen.getByRole("heading", { name: "Edit expenses" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Income" }));

    expect(
      screen.getByRole("heading", { name: "Edit income" }),
    ).toBeInTheDocument();
    expect(mockUseBudgetMonthIncomeItems).toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Income" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Expenses" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("preserves an expense draft after switching tabs and back", async () => {
    primeAllPanels();
    renderShell("expenses");

    const foodRow = screen.getByTestId(`period-expense-row-${foodRowId}`);
    const amountInput = within(foodRow).getByRole("textbox");
    fireEvent.change(amountInput, { target: { value: "999" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).not.toBeDisabled();
    });

    // Bounce through another tab and back.
    fireEvent.click(screen.getByRole("tab", { name: "Income" }));
    fireEvent.click(screen.getByRole("tab", { name: "Expenses" }));

    const foodRowAfter = screen.getByTestId(`period-expense-row-${foodRowId}`);
    expect(within(foodRowAfter).getByRole("textbox")).toHaveValue("999");

    // Save is still enabled because the draft survived the tab bounce.
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).not.toBeDisabled();
  });

  it("mounts the debt panel when opened with panel='debts'", () => {
    primeAllPanels();
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    // PR F: DebtsPanel reads the rich `debt-editor` model. The legacy
    // `useBudgetMonthDebts` hook is intentionally left unprimed so the
    // assertion at the bottom can confirm the panel does not touch it.
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 800,
          balance: 12000,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderShell("debts");

    expect(
      screen.getByRole("heading", { name: "Edit debts" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Credit card")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Debts" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Sibling panels are not mounted on initial open.
    expect(mockUseBudgetMonthEditor).not.toHaveBeenCalled();
    expect(mockUseBudgetMonthIncomeItems).not.toHaveBeenCalled();
    expect(mockUseBudgetMonthSavingsGoals).not.toHaveBeenCalled();
  });

  it("disables the query of a visited tab once another tab becomes active", () => {
    primeAllPanels();
    renderShell("expenses");

    // Visit income — its query gets enabled while it is the active tab.
    fireEvent.click(screen.getByRole("tab", { name: "Income" }));
    const enabledArg = (
      mockUseBudgetMonthIncomeItems.mock.calls.at(-1) ?? []
    )[1];
    expect(enabledArg).toBe(true);

    // Switch back to Expenses. Income panel stays mounted (drafts kept)
    // but its query must report disabled going forward.
    fireEvent.click(screen.getByRole("tab", { name: "Expenses" }));

    const lastIncomeCall = mockUseBudgetMonthIncomeItems.mock.calls.at(-1);
    expect(lastIncomeCall).toBeDefined();
    expect(lastIncomeCall?.[1]).toBe(false);
  });

  it("syncs to the new tab synchronously when reopened on a different pillar", () => {
    primeAllPanels();

    const { rerender } = render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="expenses"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Close the drawer (parent flips `open` first).
    rerender(
      <MemoryRouter>
        <EditPeriodDrawer
          open={false}
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="expenses"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Now measure only the reopen render's hook traffic.
    mockUseBudgetMonthEditor.mockClear();
    mockUseBudgetMonthIncomeItems.mockClear();
    mockUseBudgetMonthSavingsGoals.mockClear();

    // Parent reopens on a different pillar.
    rerender(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel="savings"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // The savings tab is selected from the very first render of the reopen.
    expect(
      screen.getByRole("heading", { name: "Edit savings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Savings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // No stale expense fetch on the reopen render: the previous tab must
    // not re-subscribe even transiently. Income was never visited so it
    // stays silent too.
    expect(mockUseBudgetMonthEditor).not.toHaveBeenCalled();
    expect(mockUseBudgetMonthIncomeItems).not.toHaveBeenCalled();

    // Savings is now mounted and enabled.
    const lastSavingsCall =
      mockUseBudgetMonthSavingsGoals.mock.calls.at(-1) ?? [];
    expect(lastSavingsCall[1]).toBe(true);
  });

  it("saves only the active tab's domain even when other tabs are visited", async () => {
    primeAllPanels();
    mockMutateAsync.mockResolvedValue(undefined);

    renderShell("expenses");

    // Visit Income and Savings to mount their drafts.
    fireEvent.click(screen.getByRole("tab", { name: "Income" }));
    fireEvent.click(screen.getByRole("tab", { name: "Savings" }));

    // Back to Expenses, make a change, save.
    fireEvent.click(screen.getByRole("tab", { name: "Expenses" }));

    const foodRow = screen.getByTestId(`period-expense-row-${foodRowId}`);
    fireEvent.change(within(foodRow).getByRole("textbox"), {
      target: { value: "777" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    // Other domains must not be saved by the active-tab save.
    expect(mockIncomeMutateAsync).not.toHaveBeenCalled();
    expect(mockSavingsMutateAsync).not.toHaveBeenCalled();
    expect(mockDebtsMutateAsync).not.toHaveBeenCalled();
  });
});

describe("EditPeriodDrawer footer projection (PR B)", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUsePatchBudgetMonthExpenseItemsBulk.mockReset();
    mockUseBudgetMonthIncomeItems.mockReset();
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReset();
    mockUseBudgetMonthSavingsGoals.mockReset();
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReset();
    mockUseBudgetMonthDebts.mockReset();
    mockUseBudgetMonthDebtEditor.mockReset();
    mockUsePatchBudgetMonthDebtsBulk.mockReset();
    mockUseExpenseCategories.mockReset();
    mockMutateAsync.mockReset();
    mockIncomeMutateAsync.mockReset();
    mockSavingsMutateAsync.mockReset();
    mockDebtsMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  function renderWithProjection(
    panel: "expenses" | "income" | "savings" | "debts",
  ) {
    return render(
      <MemoryRouter>
        <EditPeriodDrawer
          open
          yearMonth="2026-04"
          periodLabel="April 2026"
          periodDateRangeLabel="Apr 1 - Apr 30"
          panel={panel}
          dashboardTerms={PROJECTION_TERMS}
          currency="SEK"
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
  }

  it("excludes inactive income rows from the projection delta", async () => {
    const activeRowId = "55555555-5555-4555-8555-555555555555";
    const inactiveRowId = "66666666-6666-4666-8666-666666666666";
    // PR D: IncomePanel reads month meta to resolve `readOnly`.
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
      isLoading: false,
      isError: false,
    });
    mockUseBudgetMonthIncomeItems.mockReturnValue({
      data: [
        {
          id: activeRowId,
          sourceIncomeItemId: null,
          kind: "salary",
          name: "Salary",
          amountMonthly: 30000,
          isActive: true,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
        {
          id: inactiveRowId,
          sourceIncomeItemId: null,
          kind: "sideHustle",
          name: "Old side gig",
          amountMonthly: 1500,
          isActive: false,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
      mutateAsync: mockIncomeMutateAsync,
      isPending: false,
    });

    renderWithProjection("income");

    // Editing an inactive row produces a draft, but the dashboard's
    // `totalIncome` doesn't count it — so projection must stay at base.
    const inactiveRow = screen.getByTestId(
      `period-income-row-${inactiveRowId}`,
    );
    fireEvent.change(within(inactiveRow).getByRole("textbox"), {
      target: { value: "9000" },
    });

    await waitFor(() => {
      const projection = screen.getByTestId("quick-edit-projection");
      expect(projection.getAttribute("data-projection-state")).toBe(
        "unchanged",
      );
    });

    // No delta chip rendered — the projection did not lie.
    expect(
      screen.queryByTestId("quick-edit-projection-delta"),
    ).not.toBeInTheDocument();
  });

  it("projects a positive delta when an active income row increases", async () => {
    const activeRowId = "55555555-5555-4555-8555-555555555555";
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
      isLoading: false,
      isError: false,
    });
    mockUseBudgetMonthIncomeItems.mockReturnValue({
      data: [
        {
          id: activeRowId,
          sourceIncomeItemId: null,
          kind: "salary",
          name: "Salary",
          amountMonthly: 30000,
          isActive: true,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
      mutateAsync: mockIncomeMutateAsync,
      isPending: false,
    });

    renderWithProjection("income");

    const row = screen.getByTestId(`period-income-row-${activeRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "30500" },
    });

    await waitFor(() => {
      const projection = screen.getByTestId("quick-edit-projection");
      expect(projection.getAttribute("data-projection-state")).toBe("changed");
    });

    const delta = screen.getByTestId("quick-edit-projection-delta");
    // +500 income → free money rises by 500. Currency text uses SEK.
    expect(delta.textContent).toContain("+");
    expect(delta.textContent).toContain("500");
  });

  it("disables save and shows the fix-validation copy on an invalid income draft", async () => {
    const activeRowId = "55555555-5555-4555-8555-555555555555";
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
      isLoading: false,
      isError: false,
    });
    mockUseBudgetMonthIncomeItems.mockReturnValue({
      data: [
        {
          id: activeRowId,
          sourceIncomeItemId: null,
          kind: "salary",
          name: "Salary",
          amountMonthly: 30000,
          isActive: true,
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
      mutateAsync: mockIncomeMutateAsync,
      isPending: false,
    });

    renderWithProjection("income");

    const row = screen.getByTestId(`period-income-row-${activeRowId}`);
    // sanitizeMoneyInput strips letters but leaves an empty string, which
    // we treat as "amount required".
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      const projection = screen.getByTestId("quick-edit-projection");
      expect(projection.getAttribute("data-projection-state")).toBe(
        "invalid",
      );
    });

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    expect(within(row).getByRole("alert")).toBeInTheDocument();
  });

  it("disables save on an invalid savings draft and surfaces the error", async () => {
    const savingsRowId = "77777777-7777-4777-8777-777777777777";
    mockUseBudgetMonthSavingsGoals.mockReturnValue({
      data: [
        {
          id: savingsRowId,
          sourceSavingsGoalId: null,
          name: "Emergency fund",
          targetAmount: 50000,
          targetDate: null,
          amountSaved: 0,
          monthlyContribution: 1500,
          status: "active",
          isDeleted: false,
          isMonthOnly: false,
          canUpdateDefault: true,
        },
      ],
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthSavingsGoalsBulk.mockReturnValue({
      mutateAsync: mockSavingsMutateAsync,
      isPending: false,
    });

    renderWithProjection("savings");

    const row = screen.getByTestId(`period-savings-row-${savingsRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
    });

    expect(within(row).getByRole("alert")).toBeInTheDocument();
    expect(mockSavingsMutateAsync).not.toHaveBeenCalled();
  });

  it("projects a negative delta when an included debt's planned payment rises (PR F)", async () => {
    // PR F lights up the debt projection: the rich `debt-editor` model
    // exposes `summary.includedMonthlyPaymentTotal` (the term the dashboard
    // equation already uses), so a draft delta on an included row moves
    // free money downward by the same amount — and a skipped row's edit
    // (not exercised here) would correctly leave the projection at base.
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 800,
          balance: 12000,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "850" },
    });

    await waitFor(() => {
      const projection = screen.getByTestId("quick-edit-projection");
      expect(projection.getAttribute("data-projection-state")).toBe("changed");
    });

    const delta = screen.getByTestId("quick-edit-projection-delta");
    // +50 debt payment → free money falls by 50.
    expect(delta.textContent).toContain("−");
    expect(delta.textContent).toContain("50");
  });

  it("disables save on an invalid debt draft and surfaces the error", async () => {
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 800,
          balance: 12000,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).toBeDisabled();
    });

    expect(within(row).getByRole("alert")).toBeInTheDocument();
    expect(mockDebtsMutateAsync).not.toHaveBeenCalled();
  });

  it("renders balance + minimum payment as read-only context and warns when below min (PR F)", async () => {
    // The quick drawer never lets the user edit balance; it must render
    // both balance and minimum payment as fenced context. When the planned
    // payment dips below `minPayment`, an advisory (non-blocking) warning
    // surfaces.
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 800,
          balance: 12000,
          minPayment: 500,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    const context = screen.getByTestId(`period-debt-context-${debtRowId}`);
    expect(within(context).getByText("Owed balance")).toBeInTheDocument();
    expect(within(context).getByText("Minimum payment")).toBeInTheDocument();

    // At 800 we are above the minimum of 500 — no warning yet.
    expect(
      screen.queryByTestId(`period-debt-warning-${debtRowId}`),
    ).not.toBeInTheDocument();

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "100" },
    });

    // Below minimum → advisory warning, but save stays enabled (the
    // backend validator owns hard rules; the UI here is informational).
    expect(
      await screen.findByTestId(`period-debt-warning-${debtRowId}`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).not.toBeDisabled();
  });

  it("locks the input and projection when the month is read-only (PR F)", async () => {
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto(
        [
          buildDebtEditorRow({
            id: debtRowId,
            name: "Credit card",
            monthlyPayment: 800,
            balance: 12000,
            canEditPayment: false,
          }),
        ],
        { isReadOnly: true },
      ),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    expect(within(row).getByRole("textbox")).toBeDisabled();

    const projection = screen.getByTestId("quick-edit-projection");
    expect(projection.getAttribute("data-projection-state")).toBe("readOnly");
  });

  it("warns when the planned payment does not cover interest and fees (PR F)", async () => {
    // The dirty-aware advisory folds APR + monthly fee + balance into one
    // truth via `calcDebtPaymentBreakdown` against `row.apr`/`monthlyFee`/
    // `balance` and the user's current draft. Snapshot: balance 10000 at
    // 24% APR → monthly interest floor = 200. Initial payment 50 is well
    // below the floor, so the warning fires on the as-rendered amount —
    // and (per the test below) we never use the backend's stale
    // `paymentBreakdown.coversInterestAndFees` snapshot.
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 50,
          balance: 10000,
          apr: 24,
          minPayment: 200,
          // The snapshot is intentionally set to `true` here so the test
          // also asserts the panel ignores the stale backend value and
          // computes the advisory from the dirty inputs instead.
          coversInterestAndFees: true,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    const warning = screen.getByTestId(`period-debt-warning-${debtRowId}`);
    expect(warning.textContent).toContain(
      "Payment does not cover interest and fee",
    );
  });

  it("surfaces the coversInterestAndFees warning when the user lowers payment below the floor (PR F)", async () => {
    // Regression: the advisory must track dirty edits. Original payment
    // (800) sits above the interest+fee floor (balance 10000 × 24% / 12
    // = 200), so on mount no warning is shown. Lowering the input to 50
    // drops below the floor → warning appears in real time even though
    // the backend snapshot still says coversInterestAndFees === true.
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 800,
          balance: 10000,
          apr: 24,
          coversInterestAndFees: true,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    // On mount the row covers comfortably, so no warning yet.
    expect(
      screen.queryByTestId(`period-debt-warning-${debtRowId}`),
    ).not.toBeInTheDocument();

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "50" },
    });

    const warning = await screen.findByTestId(
      `period-debt-warning-${debtRowId}`,
    );
    expect(warning.textContent).toContain(
      "Payment does not cover interest and fee",
    );
  });

  it("clears the coversInterestAndFees warning when the user raises payment above the floor (PR F)", async () => {
    // Regression mirror: original payment (50) sits below the floor —
    // the advisory shows on mount even though the backend snapshot says
    // true (the panel computes from dirty inputs). Raising the input to
    // 500 clears the floor (200) → warning disappears.
    const debtRowId = "11111111-2222-4333-8444-555555555555";
    mockUseBudgetMonthDebtEditor.mockReturnValue({
      data: buildDebtEditorDto([
        buildDebtEditorRow({
          id: debtRowId,
          name: "Credit card",
          monthlyPayment: 50,
          balance: 10000,
          apr: 24,
          coversInterestAndFees: true,
        }),
      ]),
      isLoading: false,
      isError: false,
    });
    mockUsePatchBudgetMonthDebtsBulk.mockReturnValue({
      mutateAsync: mockDebtsMutateAsync,
      isPending: false,
    });

    renderWithProjection("debts");

    // On mount the draft (50) is below the floor → warning visible.
    expect(
      screen.getByTestId(`period-debt-warning-${debtRowId}`),
    ).toBeInTheDocument();

    const row = screen.getByTestId(`period-debt-row-${debtRowId}`);
    fireEvent.change(within(row).getByRole("textbox"), {
      target: { value: "500" },
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(`period-debt-warning-${debtRowId}`),
      ).not.toBeInTheDocument();
    });
  });
});
