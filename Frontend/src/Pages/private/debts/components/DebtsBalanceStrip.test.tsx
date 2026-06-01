import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  DebtEditorRowDto,
  DebtEditorSummaryDto,
} from "@/types/budget/DebtEditorDto";
import DebtsBalanceStrip from "./DebtsBalanceStrip";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "sv-SE",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const summary: DebtEditorSummaryDto = {
  includedMonthlyPaymentTotal: 4500,
  notIncludedMonthlyPaymentTotal: 1800,
  activeLiabilityBalanceTotal: 262200,
  paidOffBalanceTotal: 0,
  archivedBalanceTotal: 0,
  includedCount: 3,
  notIncludedCount: 1,
  paidOffCount: 1,
  archivedCount: 1,
};

const row = (overrides: Partial<DebtEditorRowDto>): DebtEditorRowDto => ({
  id: "row",
  sourceDebtId: null,
  name: "Test",
  type: "bank_loan",
  balance: 1000,
  sourceBalance: null,
  apr: 0,
  sourceApr: null,
  monthlyFee: null,
  sourceMonthlyFee: null,
  minPayment: null,
  sourceMinPayment: null,
  termMonths: null,
  sourceTermMonths: null,
  monthlyPayment: 1000,
  sourceMonthlyPayment: null,
  sourceLifecycleStatus: "active",
  participationStatus: "included",
  isMonthOnly: true,
  isRemoved: false,
  sortOrder: 0,
  group: "active",
  progress: null,
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
  disabledReasons: [],
  ...overrides,
});

describe("DebtsBalanceStrip", () => {
  it("renders payments and owed balance in separate, labelled zones", () => {
    render(
      <DebtsBalanceStrip
        summary={summary}
        activeRows={[]}
        freeAfterDebts={18623}
      />,
    );
    // Payments zone exists and shows the included total with a leading minus.
    const payments = screen.getByTestId("debts-strip-payments-value");
    expect(payments.textContent ?? "").toMatch(/−/);

    // Balance zone exists and shows the active liability balance — never the
    // payment total.
    const balance = screen.getByTestId("debts-strip-balance-value");
    expect(balance.textContent ?? "").not.toMatch(/4 ?500/);

    // The snapshot note explicitly says skipped debts are still owed — the
    // FE never asserts otherwise.
    const note = screen.getByTestId("debts-strip-snapshot-note");
    expect(note).toBeInTheDocument();
  });

  it("renders an em-dash for `kvar efter` when the dashboard query has not loaded yet", () => {
    render(
      <DebtsBalanceStrip
        summary={summary}
        activeRows={[]}
        freeAfterDebts={null}
      />,
    );
    const free = screen.getByTestId("debts-strip-free-value");
    expect(free.textContent).toBe("—");
  });

  it("hides the type-split meter entirely when there are no active payments", () => {
    render(
      <DebtsBalanceStrip
        summary={{ ...summary, includedMonthlyPaymentTotal: 0 }}
        activeRows={[]}
        freeAfterDebts={0}
      />,
    );
    expect(screen.queryByTestId("debts-strip-meter")).not.toBeInTheDocument();
  });

  it("only renders meter segments for buckets that actually have rows", () => {
    render(
      <DebtsBalanceStrip
        summary={summary}
        activeRows={[
          row({ type: "bank_loan", monthlyPayment: 1500 }),
          row({ type: "revolving", monthlyPayment: 1000 }),
        ]}
        freeAfterDebts={18623}
      />,
    );
    expect(screen.getByTestId("debts-strip-meter-seg-loan")).toBeInTheDocument();
    expect(
      screen.getByTestId("debts-strip-meter-seg-credit"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("debts-strip-meter-seg-installment"),
    ).not.toBeInTheDocument();
  });
});
