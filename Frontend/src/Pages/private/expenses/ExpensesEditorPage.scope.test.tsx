import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ExpensesEditorPage from "./ExpensesEditorPage";

const mockUseBudgetMonthEditor = vi.fn();
const mockPatchMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

const rentCategoryId = "11111111-1111-4111-8111-111111111111";
const foodCategoryId = "22222222-2222-4222-8222-222222222222";
const rentRowId = "33333333-3333-4333-8333-333333333333";
const foodRowId = "44444444-4444-4444-8444-444444444444";
const insuranceRowId = "77777777-7777-4777-8777-777777777777";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

vi.mock("@/ui/toast/toast", () => ({
  useToast: () => mockToast,
}));

const mockUseBudgetDashboardMonthQuery = vi.fn();

vi.mock("@/hooks/budget/useBudgetDashboardMonthQuery", () => ({
  useBudgetDashboardMonthQuery: (...args: unknown[]) =>
    mockUseBudgetDashboardMonthQuery(...args),
}));

const mockUseBudgetMonthsStatusQuery = vi.fn();

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/dashboard/buildDashboardSummaryAggregate", () => ({
  buildDashboardSummaryAggregate: () => ({
    summary: {
      totalIncome: 5000,
      totalExpenditure: 1300,
      remainingToSpend: 3700,
      header: {
        periodLabel: "May 2026",
      },
    },
  }),
}));

vi.mock("@/hooks/budget/useExpenseCategories", () => ({
  useExpenseCategories: () => ({
    data: [
      { id: rentCategoryId, name: "Housing", code: "housing" },
      { id: foodCategoryId, name: "Food", code: "food" },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) => mockUseBudgetMonthEditor(...args),
  useCreateBudgetMonthExpenseItem: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  usePatchBudgetMonthExpenseItem: () => ({
    mutateAsync: mockPatchMutateAsync,
    isPending: false,
  }),
  useDeleteBudgetMonthExpenseItem: () => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

vi.mock("./components/ExpensesLedgerSection", () => ({
  default: ({
    group,
    onEdit,
    onPauseToggle,
  }: {
    group: {
      key: string;
      rows: Array<{
        id: string;
        name: string;
        amountMonthly: number;
      }>;
    };
    onEdit: (row: unknown) => void;
    onPauseToggle: (row: unknown) => void;
  }) => (
    <section data-testid={`ledger-${group.key}`}>
      {group.rows.map((row) => (
        <div key={row.id}>
          <span>{row.name}</span>
          <span>{row.amountMonthly}</span>
          <button type="button" onClick={() => onEdit(row)}>
            Edit {row.name}
          </button>
          <button type="button" onClick={() => onPauseToggle(row)}>
            Toggle {row.name}
          </button>
        </div>
      ))}
    </section>
  ),
}));

function buildEditorData() {
  return {
    month: {
      budgetMonthId: "55555555-5555-4555-8555-555555555555",
      yearMonth: "2026-05",
      status: "open",
      isEditable: true,
      carryOverAmount: null,
      carryOverMode: "none",
    },
    expenseItems: [
      {
        id: rentRowId,
        sourceExpenseItemId: "66666666-6666-4666-8666-666666666666",
        categoryId: rentCategoryId,
        name: "Rent",
        amountMonthly: 1000,
        subscriptionLifecycleStatus: null,
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
        amountMonthly: 300,
        subscriptionLifecycleStatus: null,
        isActive: true,
        isDeleted: false,
        isMonthOnly: true,
        canUpdateDefault: false,
      },
      {
        id: insuranceRowId,
        sourceExpenseItemId: "88888888-8888-4888-8888-888888888888",
        categoryId: rentCategoryId,
        name: "Insurance",
        amountMonthly: 200,
        subscriptionLifecycleStatus: null,
        isActive: true,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: true,
      },
    ],
  };
}

describe("ExpensesEditorPage immediate scoped edits", () => {
  beforeEach(() => {
    mockUseBudgetMonthsStatusQuery.mockReset();
    mockUseBudgetMonthsStatusQuery.mockReturnValue({
      data: {
        openMonthYearMonth: "2026-05",
        currentYearMonth: "2026-05",
        gapMonthsCount: 0,
        months: [
          {
            yearMonth: "2026-05",
            status: "open",
            openedAt: "2026-05-01T00:00:00Z",
            closedAt: null,
          },
        ],
        suggestedAction: "none",
      },
      isLoading: false,
      isError: false,
    });
    mockUseBudgetDashboardMonthQuery.mockReset();
    mockUseBudgetDashboardMonthQuery.mockReturnValue({
      data: {},
      isLoading: false,
    });
    mockUseBudgetMonthEditor.mockReset();
    mockUseBudgetMonthEditor.mockReturnValue({
      data: buildEditorData(),
      isLoading: false,
      isError: false,
    });
    mockPatchMutateAsync.mockReset();
    mockPatchMutateAsync.mockResolvedValue(undefined);
    mockCreateMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("resolves the editable open month without selected month state", () => {
    render(<ExpensesEditorPage />);

    expect(mockUseBudgetMonthEditor).toHaveBeenCalledWith("2026-05", true);
    expect(mockUseBudgetDashboardMonthQuery).toHaveBeenCalledWith("2026-05", {
      enabled: true,
    });
    expect(
      screen.getByRole("heading", { name: "Edit expenses · May 2026" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state when there is no open month", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue({
      data: {
        openMonthYearMonth: null,
        currentYearMonth: "2026-05",
        gapMonthsCount: 0,
        months: [],
        suggestedAction: "none",
      },
      isLoading: false,
      isError: false,
    });

    render(<ExpensesEditorPage />);

    expect(screen.getByText("No open month to edit.")).toBeInTheDocument();
  });

  it("saves modal edits immediately with row-specific scope and no page-level save", async () => {
    render(<ExpensesEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Rent" }));
    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).toHaveAttribute("aria-checked", "true");
    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "1100" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    await waitFor(() => {
      expect(mockPatchMutateAsync).toHaveBeenCalledWith({
        monthExpenseItemId: rentRowId,
        payload: expect.objectContaining({
          amountMonthly: 1100,
          updateDefault: true,
          scope: "currentMonthAndBudgetPlan",
        }),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit Insurance" }));
    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Amount per month"), {
      target: { value: "225" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Insurance Plus" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    await waitFor(() => {
      expect(mockPatchMutateAsync).toHaveBeenCalledWith({
        monthExpenseItemId: insuranceRowId,
        payload: expect.objectContaining({
          name: "Insurance Plus",
          amountMonthly: 225,
          updateDefault: false,
          scope: "budgetPlanOnly",
        }),
      });
    });

    expect(screen.queryByTestId("editor-sticky-footer")).not.toBeInTheDocument();
    expect(screen.getByText("Insurance")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });
});
