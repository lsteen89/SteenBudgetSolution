import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import DebtLedgerGroup from "./DebtLedgerGroup";
import { DEBT_GROUP_ORDER } from "../utils/debtEditorGroups";
import { emptyPaymentBreakdown } from "../__fixtures__/paymentBreakdown";

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
  sortOrder: 0,
  group: "active",
  progress: null,
  paymentBreakdown: emptyPaymentBreakdown,
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

const groupCopy = (name: "active" | "skipped" | "paid" | "archived") => {
  const copy = DEBT_GROUP_ORDER.find((g) => g.group === name);
  if (!copy) throw new Error(`missing group copy for ${name}`);
  return copy;
};

describe("DebtLedgerGroup", () => {
  it("renders no group section when there are no rows", () => {
    const { container } = render(
      <DebtLedgerGroup
        copy={groupCopy("active")}
        rows={[]}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders archived group collapsed by default", () => {
    render(
      <DebtLedgerGroup
        copy={groupCopy("archived")}
        rows={[
          baseRow({ id: "a1", group: "archived", name: "SMS-lån (2019)" }),
        ]}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    // Rows container is hidden when collapsed.
    expect(
      screen.queryByTestId("debt-ledger-group-archived-rows"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Visa arkiverade/i)).toBeInTheDocument();
  });

  it("renders rows in the order the page passes them in", () => {
    render(
      <DebtLedgerGroup
        copy={groupCopy("active")}
        rows={[
          baseRow({ id: "row-a", name: "Alpha", sortOrder: 1 }),
          baseRow({ id: "row-b", name: "Beta", sortOrder: 2 }),
        ]}
        yearMonthLabel="maj 2026"
        readOnly={false}
        onEditPayment={vi.fn()}
      />,
    );
    const rows = screen.getAllByTestId("debt-ledger-row");
    expect(rows.map((r) => r.dataset.rowId)).toEqual(["row-a", "row-b"]);
  });

  it("renders the read-only group with action affordances disabled even when the backend allows the actions", () => {
    render(
      <DebtLedgerGroup
        copy={groupCopy("active")}
        rows={[baseRow({})]}
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
