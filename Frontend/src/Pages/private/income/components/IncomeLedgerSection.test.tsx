import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildIncomeLedgerGroups } from "../utils/buildIncomeLedgerGroups";
import IncomeLedgerSection from "./IncomeLedgerSection";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "USD",
}));

const MONTH_LABEL = "May 2026";

function renderGroup({
  kind,
  rows,
  readOnly = false,
  handlers,
}: {
  kind: "salary" | "householdMember" | "sideHustle";
  rows: Array<
    Partial<{
      id: string;
      sourceIncomeItemId: string | null;
      name: string;
      amountMonthly: number;
      isActive: boolean;
      isDeleted: boolean;
      isMonthOnly: boolean;
      canUpdateDefault: boolean;
      sourceName: string | null;
      sourceAmountMonthly: number | null;
      sourceIsActive: boolean | null;
    }>
  >;
  readOnly?: boolean;
  handlers?: {
    onEdit?: ReturnType<typeof vi.fn>;
    onToggleActive?: ReturnType<typeof vi.fn>;
    onDelete?: ReturnType<typeof vi.fn>;
    onCreateInGroup?: ReturnType<typeof vi.fn>;
  };
}) {
  const onEdit = handlers?.onEdit ?? vi.fn();
  const onToggleActive = handlers?.onToggleActive ?? vi.fn();
  const onDelete = handlers?.onDelete ?? vi.fn();
  const onCreateInGroup = handlers?.onCreateInGroup ?? vi.fn();

  const wireRows = rows.map((overrides, index) => ({
    id: overrides.id ?? `row-${index}`,
    sourceIncomeItemId: overrides.sourceIncomeItemId ?? null,
    kind,
    name: overrides.name ?? "Row",
    amountMonthly: overrides.amountMonthly ?? 0,
    isActive: overrides.isActive ?? true,
    isDeleted: overrides.isDeleted ?? false,
    isMonthOnly: overrides.isMonthOnly ?? false,
    canUpdateDefault: overrides.canUpdateDefault ?? false,
    sourceName: overrides.sourceName ?? null,
    sourceAmountMonthly: overrides.sourceAmountMonthly ?? null,
    sourceIsActive: overrides.sourceIsActive ?? null,
  }));

  const groups = buildIncomeLedgerGroups({ rows: wireRows });
  const group = groups.find((g) => g.key === kind)!;

  const user = userEvent.setup();

  render(
    <IncomeLedgerSection
      group={group}
      monthLabel={MONTH_LABEL}
      readOnly={readOnly}
      onEdit={onEdit}
      onToggleActive={onToggleActive}
      onDelete={onDelete}
      onCreateInGroup={onCreateInGroup}
    />,
  );

  return { onEdit, onToggleActive, onDelete, onCreateInGroup, user };
}

/**
 * Radix dropdown listens for pointer events, not React's synthetic click, so
 * `fireEvent.click` will not open the menu in jsdom. `userEvent` dispatches
 * the right sequence. Mirrors the helper in
 * `ExpenseRowActionsMenu.test.tsx`.
 */
async function openRowMenu(
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  expectedLabelMatcher: RegExp,
) {
  await user.click(trigger);
  await waitFor(() => {
    expect(
      screen.getByRole("menuitem", { name: expectedLabelMatcher }),
    ).toBeInTheDocument();
  });
}

describe("IncomeLedgerSection", () => {
  it("renders salary using the localized display name and excludes a delete action", async () => {
    const { user } = renderGroup({
      kind: "salary",
      rows: [
        {
          id: "salary-1",
          sourceIncomeItemId: "src-1",
          name: "Net salary",
          amountMonthly: 30000,
        },
      ],
    });

    expect(screen.getByText("Net salary")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary after tax")).toBeInTheDocument();

    await openRowMenu(
      user,
      screen.getByRole("button", { name: /open row actions/i }),
      /^edit$/i,
    );
    expect(
      screen.getByRole("menuitem", { name: /^edit$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /Remove from/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: /Deactivate/i }),
    ).toBeNull();
  });

  it("does not render an add affordance on the salary group", () => {
    renderGroup({
      kind: "salary",
      rows: [
        {
          id: "salary-1",
          sourceIncomeItemId: "src-1",
          name: "Net salary",
          amountMonthly: 30000,
        },
      ],
    });

    expect(screen.queryByTestId("income-ledger-group-salary-add")).toBeNull();
  });

  it("renders a `{month} only` pill for month-only side-income rows", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: null,
          name: "Tutoring",
          amountMonthly: 1500,
          isMonthOnly: true,
        },
      ],
    });

    const pill = screen.getByTestId("income-ledger-row-pill");
    expect(pill).toHaveAttribute("data-row-pill", "monthOnly");
    expect(pill).toHaveTextContent(`${MONTH_LABEL} only`);
  });

  it("never renders a Plan or Pausad pill on a normal plan-linked active row", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: "src-1",
          name: "Consulting",
          amountMonthly: 2500,
          isMonthOnly: false,
        },
      ],
    });

    expect(screen.queryByTestId("income-ledger-row-pill")).toBeNull();
    // Defensive: banned implementation copy should never appear in this UI.
    expect(screen.queryByText(/Plan/i)).toBeNull();
    expect(screen.queryByText(/paused/i)).toBeNull();
  });

  it("places inactive rows under the inactive sublabel and excludes them from the group total", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "active-1",
          name: "Consulting",
          amountMonthly: 2500,
          isActive: true,
        },
        {
          id: "inactive-1",
          name: "Tutoring",
          amountMonthly: 1500,
          isActive: false,
        },
      ],
    });

    const divider = screen.getByTestId(
      "income-ledger-group-sideHustle-inactive-divider",
    );
    expect(divider).toHaveTextContent(
      `Inactive — not counted in ${MONTH_LABEL}'s total`,
    );

    // The group total only counts the active row.
    expect(
      screen.getByTestId("income-ledger-group-sideHustle-total"),
    ).toHaveTextContent("$2,500");

    // Inactive row exposes the `inactiveInMonth` pill (the active row does not).
    const pills = screen.getAllByTestId("income-ledger-row-pill");
    expect(pills).toHaveLength(1);
    expect(pills[0]).toHaveAttribute("data-row-pill", "inactiveInMonth");
    expect(pills[0]).toHaveTextContent("Inactive this month");
  });

  it("offers an Activate action and the deactivate label for the right rows", async () => {
    const handlers = {
      onToggleActive: vi.fn(),
    };
    const { user } = renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "active-1",
          name: "Consulting",
          amountMonthly: 2500,
          isActive: true,
        },
        {
          id: "inactive-1",
          name: "Tutoring",
          amountMonthly: 1500,
          isActive: false,
        },
      ],
      handlers,
    });

    const rowEls = screen.getAllByTestId("income-ledger-row");
    expect(rowEls).toHaveLength(2);

    // First row (active) → Deactivate this month.
    await openRowMenu(
      user,
      within(rowEls[0]).getByRole("button", { name: /open row actions/i }),
      /deactivate this month/i,
    );
    await user.click(
      screen.getByRole("menuitem", { name: /deactivate this month/i }),
    );
    expect(handlers.onToggleActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: "active-1", isActive: true }),
    );

    // Second row (inactive) → Activate for {month}.
    await openRowMenu(
      user,
      within(rowEls[1]).getByRole("button", { name: /open row actions/i }),
      new RegExp(`Activate for ${MONTH_LABEL}`, "i"),
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: new RegExp(`Activate for ${MONTH_LABEL}`, "i"),
      }),
    );
    expect(handlers.onToggleActive).toHaveBeenCalledWith(
      expect.objectContaining({ id: "inactive-1", isActive: false }),
    );
  });

  it("uses the month-scoped delete label and fires onDelete with the row", async () => {
    const handlers = { onDelete: vi.fn() };
    const { user } = renderGroup({
      kind: "sideHustle",
      rows: [{ id: "side-1", name: "Consulting", amountMonthly: 2500 }],
      handlers,
    });

    await openRowMenu(
      user,
      screen.getByRole("button", { name: /open row actions/i }),
      new RegExp(`Remove from ${MONTH_LABEL}`, "i"),
    );
    await user.click(
      screen.getByRole("menuitem", {
        name: new RegExp(`Remove from ${MONTH_LABEL}`, "i"),
      }),
    );

    expect(handlers.onDelete).toHaveBeenCalledTimes(1);
    expect(handlers.onDelete.mock.calls[0][0]).toMatchObject({
      id: "side-1",
      kind: "sideHustle",
    });
  });

  it("hides the group-level add affordance and the row menu entirely when read-only", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [{ id: "side-1", name: "Consulting", amountMonthly: 2500 }],
      readOnly: true,
    });

    expect(
      screen.queryByTestId("income-ledger-group-sideHustle-add"),
    ).toBeNull();
    // PR 3 review fix: the row kebab must be absent (not just disabled) on
    // read-only months — the disabled trigger still looks like an
    // affordance, which the income handover bans.
    expect(
      screen.queryByTestId("budget-editor-row-actions-trigger"),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /actions unavailable/i }),
    ).toBeNull();
  });

  it("calls onCreateInGroup with the group when the per-group add is clicked", () => {
    const handlers = { onCreateInGroup: vi.fn() };
    renderGroup({
      kind: "householdMember",
      rows: [],
      handlers,
    });

    fireEvent.click(
      screen.getByTestId("income-ledger-group-householdMember-add"),
    );
    expect(handlers.onCreateInGroup).toHaveBeenCalledTimes(1);
    expect(handlers.onCreateInGroup.mock.calls[0][0]).toMatchObject({
      key: "householdMember",
    });
  });

  it("renders a `Changed in {month}` pill when the wire amount diverges from the source plan amount", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: "src-1",
          name: "Consulting",
          amountMonthly: 3000,
          isMonthOnly: false,
          sourceName: "Consulting",
          sourceAmountMonthly: 2500,
          sourceIsActive: true,
        },
      ],
    });

    const pill = screen.getByTestId("income-ledger-row-pill");
    expect(pill).toHaveAttribute("data-row-pill", "changedInMonth");
    expect(pill).toHaveTextContent(`Changed in ${MONTH_LABEL}`);
  });

  it("renders the changed pill on a salary amount diff even when the backend returns a null source name", () => {
    renderGroup({
      kind: "salary",
      rows: [
        {
          id: "salary-1",
          sourceIncomeItemId: "src-salary",
          name: "Net salary",
          amountMonthly: 31000,
          isMonthOnly: false,
          // Backend's salary read intentionally returns sourceName = null.
          sourceName: null,
          sourceAmountMonthly: 30000,
          sourceIsActive: true,
        },
      ],
    });

    const pill = screen.getByTestId("income-ledger-row-pill");
    expect(pill).toHaveAttribute("data-row-pill", "changedInMonth");
    expect(pill).toHaveTextContent(`Changed in ${MONTH_LABEL}`);
  });

  it("does not render the changed pill for a plan-linked row that matches its source", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: "src-1",
          name: "Consulting",
          amountMonthly: 2500,
          isMonthOnly: false,
          sourceName: "Consulting",
          sourceAmountMonthly: 2500,
          sourceIsActive: true,
        },
      ],
    });

    expect(screen.queryByTestId("income-ledger-row-pill")).toBeNull();
  });

  it("prefers the inactive pill over the changed pill when both states apply", () => {
    // An inactive row with a divergent amount — the dominant signal for the
    // reader is "this row does not count this month", so the priority order
    // (handover §6) puts `inactiveInMonth` ahead of `changedInMonth`.
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: "src-1",
          name: "Consulting",
          amountMonthly: 3000,
          isActive: false,
          isMonthOnly: false,
          sourceName: "Consulting",
          sourceAmountMonthly: 2500,
          sourceIsActive: true,
        },
      ],
    });

    const pills = screen.getAllByTestId("income-ledger-row-pill");
    expect(pills).toHaveLength(1);
    expect(pills[0]).toHaveAttribute("data-row-pill", "inactiveInMonth");
  });

  it("prefers the month-only pill over the changed pill for month-only rows", () => {
    // Month-only rows can never be `changed` (no source to diverge from), but
    // defend the precedence in case a stale source field leaks through.
    renderGroup({
      kind: "sideHustle",
      rows: [
        {
          id: "side-1",
          sourceIncomeItemId: null,
          name: "One-off",
          amountMonthly: 1200,
          isMonthOnly: true,
          sourceName: "Stale",
          sourceAmountMonthly: 999,
          sourceIsActive: true,
        },
      ],
    });

    const pill = screen.getByTestId("income-ledger-row-pill");
    expect(pill).toHaveAttribute("data-row-pill", "monthOnly");
  });
});
