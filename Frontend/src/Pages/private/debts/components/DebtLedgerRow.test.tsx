import { render, screen } from "@testing-library/react";
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
});
