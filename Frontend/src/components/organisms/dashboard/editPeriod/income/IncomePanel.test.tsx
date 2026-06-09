import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IncomePanel from "./IncomePanel";

// Hook mocks. The drawer-level test mocks the same module via @hooks/*; we
// mirror that alias so the IncomePanel's `@/hooks/...` import resolves to
// the same mocked module (vite resolves both aliases to one file).
const mockUseBudgetMonthEditor = vi.fn();
const mockUseBudgetMonthIncomeItems = vi.fn();
const mockUsePatchBudgetMonthIncomeItemsBulk = vi.fn();
const mockUseCreateBudgetMonthIncomeItem = vi.fn();

const mockBulkMutateAsync = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock("@hooks/budget/editPeriod/useMonthEditor", () => ({
  useBudgetMonthEditor: (...args: unknown[]) => mockUseBudgetMonthEditor(...args),
  useBudgetMonthIncomeItems: (...args: unknown[]) =>
    mockUseBudgetMonthIncomeItems(...args),
  usePatchBudgetMonthIncomeItemsBulk: (...args: unknown[]) =>
    mockUsePatchBudgetMonthIncomeItemsBulk(...args),
  useCreateBudgetMonthIncomeItem: (...args: unknown[]) =>
    mockUseCreateBudgetMonthIncomeItem(...args),
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

const salaryRowId = "11111111-1111-4111-8111-111111111111";
const householdRowId = "22222222-2222-4222-8222-222222222222";
const sideRowId = "33333333-3333-4333-8333-333333333333";

function buildMonth({ status = "open", isEditable = true } = {}) {
  return {
    data: {
      month: {
        budgetMonthId: "99999999-9999-4999-8999-999999999999",
        yearMonth: "2026-04",
        status,
        isEditable,
        carryOverAmount: null,
        carryOverMode: "none",
      },
      expenseItems: [],
    },
    isLoading: false,
    isError: false,
  };
}

function buildIncomeRows(overrides?: {
  salaryActive?: boolean;
  householdActive?: boolean;
  sideActive?: boolean;
  salaryAmount?: number;
  householdAmount?: number;
  sideAmount?: number;
}) {
  const {
    salaryActive = true,
    householdActive = true,
    sideActive = true,
    salaryAmount = 30000,
    householdAmount = 4000,
    sideAmount = 1500,
  } = overrides ?? {};

  return {
    data: [
      {
        id: salaryRowId,
        sourceIncomeItemId: null,
        kind: "salary" as const,
        name: "Salary",
        amountMonthly: salaryAmount,
        isActive: salaryActive,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: true,
        sourceName: null,
        sourceAmountMonthly: null,
        sourceIsActive: null,
      },
      {
        id: householdRowId,
        sourceIncomeItemId: "aaaa1111-1111-4111-8111-111111111111",
        kind: "householdMember" as const,
        name: "Partner",
        amountMonthly: householdAmount,
        isActive: householdActive,
        isDeleted: false,
        isMonthOnly: false,
        canUpdateDefault: true,
        sourceName: "Partner",
        sourceAmountMonthly: 4000,
        sourceIsActive: true,
      },
      {
        id: sideRowId,
        sourceIncomeItemId: null,
        kind: "sideHustle" as const,
        name: "Consulting",
        amountMonthly: sideAmount,
        isActive: sideActive,
        isDeleted: false,
        isMonthOnly: true,
        canUpdateDefault: false,
        sourceName: null,
        sourceAmountMonthly: null,
        sourceIsActive: null,
      },
    ],
    isLoading: false,
    isError: false,
  };
}

function primeHooks({
  month = buildMonth(),
  income = buildIncomeRows(),
}: {
  month?: ReturnType<typeof buildMonth>;
  income?: ReturnType<typeof buildIncomeRows>;
} = {}) {
  mockUseBudgetMonthEditor.mockReturnValue(month);
  mockUseBudgetMonthIncomeItems.mockReturnValue(income);
  mockUsePatchBudgetMonthIncomeItemsBulk.mockReturnValue({
    mutateAsync: mockBulkMutateAsync,
    isPending: false,
  });
  mockUseCreateBudgetMonthIncomeItem.mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  });
}

function renderPanel(props?: Partial<React.ComponentProps<typeof IncomePanel>>) {
  return render(
    <MemoryRouter>
      <IncomePanel
        open
        yearMonth="2026-04"
        periodLabel="April 2026"
        onClose={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("IncomePanel - PR D income depth", () => {
  beforeEach(() => {
    mockUseBudgetMonthEditor.mockReset();
    mockUseBudgetMonthIncomeItems.mockReset();
    mockUsePatchBudgetMonthIncomeItemsBulk.mockReset();
    mockUseCreateBudgetMonthIncomeItem.mockReset();
    mockBulkMutateAsync.mockReset();
    mockCreateMutateAsync.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  it("groups rows by kind in fixed order: Salary → Household → Side income", () => {
    primeHooks();
    renderPanel();

    // `^=` so the regex only matches the three group containers and not the
    // `income-group-add-*` buttons that also start with `income-group-`.
    const groups = document.querySelectorAll<HTMLElement>(
      '[data-testid^="income-group-"]:not([data-testid^="income-group-add-"])',
    );

    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveAttribute("data-testid", "income-group-salary");
    expect(groups[1]).toHaveAttribute(
      "data-testid",
      "income-group-householdMember",
    );
    expect(groups[2]).toHaveAttribute("data-testid", "income-group-sideHustle");
  });

  it("salary row exposes no toggle and no add affordance for its group", () => {
    primeHooks();
    renderPanel();

    const salaryRow = screen.getByTestId(`period-income-row-${salaryRowId}`);
    // No active/inactive switch on the salary row.
    expect(
      within(salaryRow).queryByRole("switch", { name: /Count Salary/ }),
    ).toBeNull();

    // Amount input is still present and editable.
    expect(within(salaryRow).getByRole("textbox")).toBeInTheDocument();

    // No "Add to Salary" button.
    expect(screen.queryByTestId("income-group-add-salary")).toBeNull();
  });

  it("non-salary rows render an active/inactive toggle", () => {
    primeHooks();
    renderPanel();

    const householdRow = screen.getByTestId(
      `period-income-row-${householdRowId}`,
    );
    const sideRow = screen.getByTestId(`period-income-row-${sideRowId}`);

    expect(
      within(householdRow).getByRole("switch", { name: /Count Partner/ }),
    ).toBeInTheDocument();
    expect(
      within(sideRow).getByRole("switch", { name: /Count Consulting/ }),
    ).toBeInTheDocument();
  });

  it("toggling a non-salary row marks the panel dirty and zeroes its draft contribution", async () => {
    primeHooks();
    renderPanel();

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();

    const sideRow = screen.getByTestId(`period-income-row-${sideRowId}`);
    const toggle = within(sideRow).getByRole("switch", {
      name: /Count Consulting/,
    });

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).not.toBeDisabled();
    });

    // Row reports inactive in the DOM so the projection logic can verify it.
    expect(sideRow).toHaveAttribute("data-row-active", "false");
  });

  it("save payload preserves name=null for salary and sends draft.isActive for non-salary rows", async () => {
    primeHooks();
    mockBulkMutateAsync.mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderPanel({ onClose });

    // Edit salary amount.
    const salaryRow = screen.getByTestId(`period-income-row-${salaryRowId}`);
    fireEvent.change(within(salaryRow).getByRole("textbox"), {
      target: { value: "31000" },
    });

    // Toggle Consulting (side) off.
    const sideRow = screen.getByTestId(`period-income-row-${sideRowId}`);
    fireEvent.click(
      within(sideRow).getByRole("switch", { name: /Count Consulting/ }),
    );

    // Edit Household amount.
    const householdRow = screen.getByTestId(
      `period-income-row-${householdRowId}`,
    );
    fireEvent.change(within(householdRow).getByRole("textbox"), {
      target: { value: "4500" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save changes" }),
      ).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mockBulkMutateAsync).toHaveBeenCalledTimes(1);
    });

    const payload = mockBulkMutateAsync.mock.calls[0][0];

    const salaryPayload = payload.find(
      (r: { monthIncomeItemId: string }) =>
        r.monthIncomeItemId === salaryRowId,
    );
    expect(salaryPayload?.payload).toMatchObject({
      name: null,
      amountMonthly: 31000,
      isActive: true,
      updateDefault: false,
      scope: "currentMonthOnly",
    });

    const householdPayload = payload.find(
      (r: { monthIncomeItemId: string }) =>
        r.monthIncomeItemId === householdRowId,
    );
    expect(householdPayload?.payload).toMatchObject({
      name: "Partner",
      amountMonthly: 4500,
      isActive: true,
      updateDefault: false,
      scope: "currentMonthOnly",
    });

    const sidePayload = payload.find(
      (r: { monthIncomeItemId: string }) => r.monthIncomeItemId === sideRowId,
    );
    expect(sidePayload?.payload).toMatchObject({
      name: "Consulting",
      isActive: false,
      updateDefault: false,
      scope: "currentMonthOnly",
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("inline create in the side income group sends kind=sideHustle, isActive=true, currentMonthOnly", async () => {
    primeHooks();
    mockCreateMutateAsync.mockResolvedValue(undefined);
    renderPanel();

    fireEvent.click(screen.getByTestId("income-group-add-sideHustle"));

    const form = await screen.findByTestId("inline-create-income-sideHustle");
    fireEvent.change(within(form).getByPlaceholderText("Name"), {
      target: { value: "Workshops" },
    });
    fireEvent.change(within(form).getByPlaceholderText("Amount"), {
      target: { value: "2200" },
    });

    fireEvent.click(within(form).getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      kind: "sideHustle",
      name: "Workshops",
      amountMonthly: 2200,
      isActive: true,
      scope: "currentMonthOnly",
    });
  });

  it("inline create in the household group sends kind=householdMember", async () => {
    primeHooks();
    mockCreateMutateAsync.mockResolvedValue(undefined);
    renderPanel();

    fireEvent.click(screen.getByTestId("income-group-add-householdMember"));

    const form = await screen.findByTestId(
      "inline-create-income-householdMember",
    );
    fireEvent.change(within(form).getByPlaceholderText("Name"), {
      target: { value: "Roommate" },
    });
    fireEvent.change(within(form).getByPlaceholderText("Amount"), {
      target: { value: "3000" },
    });

    fireEvent.click(within(form).getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      kind: "householdMember",
      name: "Roommate",
      amountMonthly: 3000,
      isActive: true,
      scope: "currentMonthOnly",
    });
  });

  it("opening one group's inline create hides the other group's Add button", async () => {
    primeHooks();
    renderPanel();

    fireEvent.click(screen.getByTestId("income-group-add-sideHustle"));

    await screen.findByTestId("inline-create-income-sideHustle");

    expect(
      screen.queryByTestId("income-group-add-householdMember"),
    ).toBeNull();
    expect(screen.queryByTestId("income-group-add-sideHustle")).toBeNull();
  });

  it("excludes inactive rows from the active total used for projection", async () => {
    // With Consulting inactive, the dashboard income total should reflect
    // salary (30000) + household (4000) = 34000. Bumping the inactive
    // Consulting amount must NOT move that total.
    primeHooks({ income: buildIncomeRows({ sideActive: false }) });

    renderPanel({
      dashboardTerms: {
        income: 34000,
        carryOver: 0,
        expenses: 10000,
        savings: 1000,
        debts: 0,
        remaining: 23000,
      },
      currency: "SEK",
    });

    const sideRow = screen.getByTestId(`period-income-row-${sideRowId}`);
    fireEvent.change(within(sideRow).getByRole("textbox"), {
      target: { value: "9999" },
    });

    await waitFor(() => {
      const projection = screen.getByTestId("quick-edit-projection");
      expect(projection.getAttribute("data-projection-state")).toBe(
        "unchanged",
      );
    });
    expect(
      screen.queryByTestId("quick-edit-projection-delta"),
    ).not.toBeInTheDocument();
  });

  it("read-only month hides toggles, add affordances, and disables Save", () => {
    primeHooks({ month: buildMonth({ status: "closed", isEditable: false }) });
    renderPanel();

    // Closed-month banner replaces the month-only helper.
    expect(
      screen.getByText("This month is closed and cannot be edited."),
    ).toBeInTheDocument();

    // No active toggles for non-salary rows.
    expect(screen.queryAllByRole("switch")).toHaveLength(0);

    // No add affordances anywhere.
    expect(
      screen.queryByTestId("income-group-add-sideHustle"),
    ).toBeNull();
    expect(
      screen.queryByTestId("income-group-add-householdMember"),
    ).toBeNull();

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
  });

  it("renders a 'Locked' badge on the salary group", () => {
    primeHooks();
    renderPanel();

    // The locked badge sits beside the salary group title.
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});
