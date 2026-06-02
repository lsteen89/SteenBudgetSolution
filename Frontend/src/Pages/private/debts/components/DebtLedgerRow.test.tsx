import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import DebtLedgerRow from "./DebtLedgerRow";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "sv-SE",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const baseRow = (overrides: Partial<DebtEditorRowDto>): DebtEditorRowDto => ({
  id: "row-1",
  sourceDebtId: "src-1",
  name: "Privatlån",
  type: "bank_loan",
  balance: 38500,
  sourceBalance: 38500,
  apr: 6.4,
  sourceApr: 6.4,
  monthlyFee: null,
  sourceMonthlyFee: null,
  minPayment: 1100,
  sourceMinPayment: 1100,
  termMonths: 28,
  sourceTermMonths: 28,
  monthlyPayment: 1500,
  sourceMonthlyPayment: 1200,
  sourceLifecycleStatus: "active",
  participationStatus: "included",
  isMonthOnly: false,
  isRemoved: false,
  sortOrder: 1,
  group: "active",
  progress: null,
  actions: {
    canEditPayment: true,
    canEditDetails: true,
    canUpdateBalance: true,
    canSkipThisMonth: true,
    canIncludeThisMonth: false,
    canMarkPaidOff: true,
    canArchive: true,
    canRestore: false,
    canRemove: false,
    canUpdatePlan: true,
  },
  disabledReasons: [],
  ...overrides,
});

describe("DebtLedgerRow", () => {
  it("renders balance and planned payment in separate columns for active rows", () => {
    render(
      <DebtLedgerRow
        row={baseRow({})}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    // Two distinct cells — never collapsed into one.
    const balanceCells = screen.getAllByTestId("debt-row-balance");
    const paymentCells = screen.getAllByTestId("debt-row-payment");
    expect(balanceCells.length).toBeGreaterThan(0);
    expect(paymentCells.length).toBeGreaterThan(0);
    expect(paymentCells[0]).not.toHaveAttribute("data-empty", "true");
  });

  it("renders the planned payment as an em-dash for skipped rows so zero is never read as 'planned 0 kr'", () => {
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "skipped",
          participationStatus: "notIncluded",
          monthlyPayment: 0,
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    const paymentCells = screen.getAllByTestId("debt-row-payment");
    expect(paymentCells[0]).toHaveAttribute("data-empty", "true");
    expect(paymentCells[0]).toHaveTextContent("—");
  });

  it("never treats a zero monthly payment in the active group as skipped — balance and payment stay separate", () => {
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "active",
          monthlyPayment: 0,
          balance: 5000,
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    const paymentCells = screen.getAllByTestId("debt-row-payment");
    // Zero stays as the literal value the backend reports — never an em-dash
    // because the row is genuinely active.
    expect(paymentCells[0]).not.toHaveAttribute("data-empty", "true");
    expect(paymentCells[0]).toHaveTextContent(/0/);
  });

  it("treats a zero balance as a regular value, not a paid-off signal", () => {
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "active",
          balance: 0,
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    // Group stays `active` on the row dataset; balance reads `0`. No "Betald"
    // badge appears.
    expect(screen.queryByText(/^Betald$/)).not.toBeInTheDocument();
  });

  it("renders the action menu disabled when the backend forbids the only wired action", () => {
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "skipped",
          actions: {
            ...baseRow({}).actions,
            canEditPayment: false,
          },
          disabledReasons: ["alreadyNotIncluded"],
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    const triggers = screen.getAllByTestId("budget-editor-row-actions-trigger");
    // Both mobile and desktop layouts render — both must be disabled when no
    // wired actions are available.
    expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(trigger).toHaveAttribute("data-disabled", "true");
    }
  });

  it("falls back to row.monthlyPayment for the planned meta on skipped month-only rows", () => {
    // Backend PR 5 keeps the row's MonthlyPayment when participation flips to
    // notIncluded so the planned amount is still recoverable. For month-only
    // rows there is no source-side payment, so the row itself IS the plan and
    // the meta line must surface that.
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "skipped",
          participationStatus: "notIncluded",
          isMonthOnly: true,
          sourceDebtId: null,
          sourceMonthlyPayment: null,
          monthlyPayment: 400,
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    // Each layout (mobile + desktop) renders the meta string once.
    const matches = screen.getAllByText(/planen:\s*400/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("uses sourceMonthlyPayment (not monthlyPayment) for the planned meta on source-linked skipped rows", () => {
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "skipped",
          participationStatus: "notIncluded",
          isMonthOnly: false,
          sourceMonthlyPayment: 1800,
          monthlyPayment: 1500,
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    // Source plan value wins; the month-row value never leaks into the
    // "planen:" meta when a real source exists.
    expect(screen.getAllByText(/planen:\s*1\s*800/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/planen:\s*1\s*500/i)).not.toBeInTheDocument();
  });

  it("renders read-only month rows with disabled action affordances regardless of row permissions", () => {
    render(
      <DebtLedgerRow
        row={baseRow({})}
        yearMonthLabel="maj 2026"
        readOnly
        onEditPayment={vi.fn()}
      />,
    );
    const triggers = screen.getAllByTestId("budget-editor-row-actions-trigger");
    for (const trigger of triggers) {
      expect(trigger).toHaveAttribute("data-disabled", "true");
    }
  });

  // ---------------------------------------------------------------- PR 8 lifecycle
  // Radix dropdown opens on pointer events; `userEvent` dispatches the right
  // sequence in jsdom. Mirrors the income/expense menu-open helpers.
  async function openFirstMenu(user: ReturnType<typeof userEvent.setup>) {
    const triggers = screen.getAllByTestId("budget-editor-row-actions-trigger");
    await user.click(triggers[0]);
    await waitFor(() => {
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(0);
    });
  }

  it("offers skip / mark-paid / archive on an active row when the backend permits them", async () => {
    const user = userEvent.setup();
    const onLifecycleAction = vi.fn();
    render(
      <DebtLedgerRow
        row={baseRow({})}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
        onLifecycleAction={onLifecycleAction}
      />,
    );

    await openFirstMenu(user);
    expect(
      screen.getByRole("menuitem", { name: /hoppa över denna månad/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /markera som betald/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /^arkivera$/i }),
    ).toBeInTheDocument();
    // Active rows never expose include / restore / remove.
    expect(
      screen.queryByRole("menuitem", { name: /inkludera/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: /återställ/i }),
    ).toBeNull();
  });

  it("invokes onLifecycleAction with the chosen action and the row", async () => {
    const user = userEvent.setup();
    const onLifecycleAction = vi.fn();
    const row = baseRow({});
    render(
      <DebtLedgerRow
        row={row}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
        onLifecycleAction={onLifecycleAction}
      />,
    );

    await openFirstMenu(user);
    await user.click(
      screen.getByRole("menuitem", { name: /hoppa över denna månad/i }),
    );
    expect(onLifecycleAction).toHaveBeenCalledWith(row, "skip");
  });

  it("offers include on a skipped row that can be re-included", async () => {
    const user = userEvent.setup();
    const onLifecycleAction = vi.fn();
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "skipped",
          participationStatus: "notIncluded",
          monthlyPayment: 0,
          actions: {
            ...baseRow({}).actions,
            canSkipThisMonth: false,
            canIncludeThisMonth: true,
          },
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
        onLifecycleAction={onLifecycleAction}
      />,
    );

    await openFirstMenu(user);
    expect(
      screen.getByRole("menuitem", { name: /inkludera denna månad/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: /hoppa över/i }),
    ).toBeNull();
  });

  // Restore and remove are mutually exclusive in the backend: restore needs a
  // source-linked archived row (`!isMonthOnly && sourceArchived`), remove needs
  // a month-only row (`isMonthOnly`). See DebtEditorActionResolver. Each is
  // exercised with its own realistic fixture rather than one impossible row.
  it("offers restore (only) on a source-linked archived row", async () => {
    const user = userEvent.setup();
    const onLifecycleAction = vi.fn();
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "archived",
          sourceLifecycleStatus: "archived",
          isMonthOnly: false,
          sourceDebtId: "src-1",
          actions: {
            canEditPayment: false,
            canEditDetails: false,
            canUpdateBalance: false,
            canSkipThisMonth: false,
            canIncludeThisMonth: false,
            canMarkPaidOff: false,
            canArchive: false,
            canRestore: true,
            canRemove: false,
            canUpdatePlan: false,
          },
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
        onLifecycleAction={onLifecycleAction}
      />,
    );

    await openFirstMenu(user);
    expect(
      screen.getByRole("menuitem", { name: /återställ skuld/i }),
    ).toBeInTheDocument();
    // A source-linked row can never be removed — archive preserves its history.
    expect(screen.queryByRole("menuitem", { name: /ta bort/i })).toBeNull();
  });

  it("offers remove (only) on a month-only removable row", async () => {
    const user = userEvent.setup();
    const onLifecycleAction = vi.fn();
    render(
      <DebtLedgerRow
        row={baseRow({
          group: "active",
          isMonthOnly: true,
          sourceDebtId: null,
          sourceLifecycleStatus: null,
          actions: {
            canEditPayment: true,
            canEditDetails: true,
            canUpdateBalance: true,
            canSkipThisMonth: true,
            canIncludeThisMonth: false,
            canMarkPaidOff: false,
            canArchive: false,
            canRestore: false,
            canRemove: true,
            canUpdatePlan: false,
          },
        })}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
        onLifecycleAction={onLifecycleAction}
      />,
    );

    await openFirstMenu(user);
    expect(
      screen.getByRole("menuitem", { name: /ta bort/i }),
    ).toBeInTheDocument();
    // A month-only row is never source-archived, so restore never appears.
    expect(
      screen.queryByRole("menuitem", { name: /återställ/i }),
    ).toBeNull();
    // And mark-paid / archive (source-linked only) stay absent too.
    expect(
      screen.queryByRole("menuitem", { name: /markera som betald/i }),
    ).toBeNull();
  });

  it("omits lifecycle actions entirely when no onLifecycleAction handler is wired", async () => {
    const user = userEvent.setup();
    render(
      <DebtLedgerRow
        row={baseRow({})}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );

    await openFirstMenu(user);
    // Only the PR 6/7 edit actions remain; no lifecycle items leak in.
    expect(
      screen.queryByRole("menuitem", { name: /hoppa över/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: /markera som betald/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("menuitem", { name: /^arkivera$/i }),
    ).toBeNull();
  });
});
