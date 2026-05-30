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

  it("hides the group-level add affordance and the row menu when read-only", () => {
    renderGroup({
      kind: "sideHustle",
      rows: [{ id: "side-1", name: "Consulting", amountMonthly: 2500 }],
      readOnly: true,
    });

    expect(
      screen.queryByTestId("income-ledger-group-sideHustle-add"),
    ).toBeNull();
    // The shared row-actions menu renders a disabled trigger in read-only mode.
    expect(
      screen.getByRole("button", { name: "Actions unavailable" }),
    ).toBeDisabled();
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
});
