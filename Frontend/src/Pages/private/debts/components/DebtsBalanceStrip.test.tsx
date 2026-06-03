import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  DebtEditorRowDto,
  DebtEditorSummaryDto,
} from "@/types/budget/DebtEditorDto";
import DebtsBalanceStrip from "./DebtsBalanceStrip";
import { emptyPaymentBreakdown } from "../__fixtures__/paymentBreakdown";

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
  includedMonthlyInterestTotal: 0,
  includedMonthlyFeeTotal: 0,
  includedPrincipalPaymentTotal: 4500,
  projectedActiveLiabilityBalanceAfterMonth: 257700,
  includedCount: 3,
  notIncludedCount: 1,
  paidOffCount: 1,
  archivedCount: 1,
  rowsBelowInterestAndFeesCount: 0,
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
  paymentBreakdown: emptyPaymentBreakdown,
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

  // ----------------------------------------- Debt Polish PR 1: breakdown strip

  it("renders the included interest / fee / principal totals from the summary DTO", () => {
    render(
      <DebtsBalanceStrip
        summary={{
          ...summary,
          includedMonthlyInterestTotal: 1002,
          includedMonthlyFeeTotal: 150,
          includedPrincipalPaymentTotal: 3348,
          projectedActiveLiabilityBalanceAfterMonth: 258852,
        }}
        activeRows={[row({ type: "bank_loan", monthlyPayment: 4500 })]}
        freeAfterDebts={18623}
      />,
    );
    expect(screen.getByTestId("debts-strip-breakdown")).toBeInTheDocument();
    expect(
      screen.getByTestId("debts-strip-breakdown-interest").textContent ?? "",
    ).toMatch(/1\s?002/);
    expect(
      screen.getByTestId("debts-strip-breakdown-fee").textContent ?? "",
    ).toMatch(/150/);
    expect(
      screen.getByTestId("debts-strip-breakdown-principal").textContent ?? "",
    ).toMatch(/3\s?348/);
    expect(
      screen.getByTestId("debts-strip-breakdown-projected").textContent ?? "",
    ).toMatch(/258\s?8/);
    expect(
      screen.queryByTestId("debts-strip-breakdown-shortfall"),
    ).not.toBeInTheDocument();
  });

  it("shows the shortfall summary message when included rows fall short of interest + fee", () => {
    render(
      <DebtsBalanceStrip
        summary={{
          ...summary,
          includedMonthlyInterestTotal: 800,
          includedMonthlyFeeTotal: 0,
          includedPrincipalPaymentTotal: 0,
          projectedActiveLiabilityBalanceAfterMonth: 262200,
          rowsBelowInterestAndFeesCount: 2,
        }}
        activeRows={[row({ type: "bank_loan", monthlyPayment: 4500 })]}
        freeAfterDebts={18623}
      />,
    );
    const advisory = screen.getByTestId("debts-strip-breakdown-shortfall");
    expect(advisory.textContent ?? "").toMatch(/2 skulder/);
    expect(advisory.textContent ?? "").toMatch(
      /täcker inte ränta och avgift/i,
    );
  });

  it("surfaces the shortfall advisory even when the active payment total is 0 (meter is hidden, breakdown is not)", () => {
    // Regression: the breakdown was once gated on the per-type meter,
    // which keys off includedMonthlyPaymentTotal > 0. A zero-payment
    // included debt with interest accruing must still raise the advisory.
    render(
      <DebtsBalanceStrip
        summary={{
          ...summary,
          includedMonthlyPaymentTotal: 0,
          includedMonthlyInterestTotal: 150,
          includedMonthlyFeeTotal: 0,
          includedPrincipalPaymentTotal: 0,
          projectedActiveLiabilityBalanceAfterMonth:
            summary.activeLiabilityBalanceTotal,
          rowsBelowInterestAndFeesCount: 1,
        }}
        activeRows={[]}
        freeAfterDebts={0}
      />,
    );
    // Meter is hidden because per-type split is empty.
    expect(screen.queryByTestId("debts-strip-meter")).not.toBeInTheDocument();
    // Breakdown surface still appears with the shortfall advisory.
    expect(screen.getByTestId("debts-strip-breakdown")).toBeInTheDocument();
    expect(
      screen.getByTestId("debts-strip-breakdown-shortfall").textContent ?? "",
    ).toMatch(/täcker inte ränta och avgift/i);
  });

  it("suppresses the breakdown surface when there is nothing meaningful to say (no interest, no fees, no shortfall)", () => {
    render(
      <DebtsBalanceStrip
        summary={{
          ...summary,
          includedMonthlyInterestTotal: 0,
          includedMonthlyFeeTotal: 0,
          includedPrincipalPaymentTotal: summary.includedMonthlyPaymentTotal,
          projectedActiveLiabilityBalanceAfterMonth:
            summary.activeLiabilityBalanceTotal -
            summary.includedMonthlyPaymentTotal,
          rowsBelowInterestAndFeesCount: 0,
        }}
        activeRows={[row({ type: "bank_loan", monthlyPayment: 4500 })]}
        freeAfterDebts={18623}
      />,
    );
    expect(screen.queryByTestId("debts-strip-breakdown")).not.toBeInTheDocument();
  });
});
