import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SavingsPlanBalanceStrip, {
  type SavingsPlanBalanceStripProps,
} from "./SavingsPlanBalanceStrip";

// Kvar is derived from the six terms the strip displays:
//   income + carry - expenses - base savings - goal savings - debts
const renderStrip = (
  override: Partial<SavingsPlanBalanceStripProps> = {},
) => {
  const props: SavingsPlanBalanceStripProps = {
    currencyCode: "SEK",
    locale: "en-US",
    incomeMonthly: 30000,
    carryOverMonthly: 500,
    expensesMonthly: 18000,
    baseSavingsMonthly: 4000,
    goalSavingsMonthly: 2000,
    debtPaymentsMonthly: 5250,
    ...override,
  };
  return render(<SavingsPlanBalanceStrip {...props} />);
};

describe("SavingsPlanBalanceStrip", () => {
  it("renders the positive balance state with the 'in balance' chip", () => {
    // 30000 + 500 - 18000 - 4000 - 2000 - 5250 = 1250
    renderStrip();

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("positive");
    expect(screen.getByTestId("savings-plan-balance-chip")).toHaveTextContent(
      /In balance/i,
    );
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250/);
    expect(
      screen.getByTestId("savings-plan-balance-message"),
    ).toHaveTextContent(/leaves/i);
  });

  it("renders the zero balance state with neutral copy", () => {
    // Bump debts so the six terms net to exactly zero.
    renderStrip({ debtPaymentsMonthly: 6500 });

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("zero");
    expect(
      screen.getByTestId("savings-plan-balance-message"),
    ).toHaveTextContent(/uses the full month room/i);
  });

  it("renders the negative balance state with calm adjustment copy (no red)", () => {
    // 30000 + 500 - 18000 - 4000 - 2000 - 7350 = -850
    renderStrip({ debtPaymentsMonthly: 7350 });

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("negative");
    expect(strip.className).not.toMatch(/red/);
    expect(screen.getByTestId("savings-plan-balance-chip")).toHaveTextContent(
      /Needs adjusting/i,
    );
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/850/);
    expect(
      screen.getByTestId("savings-plan-balance-message"),
    ).toHaveTextContent(/over this month/i);
    expect(
      screen.getByTestId("savings-plan-balance-message"),
    ).not.toHaveTextContent(/overspent|failed|cannot afford/i);
  });

  it("uses decimal display when remaining has cents", () => {
    // 30000 + 500.75 - 18000 - 4000 - 2000 - 5250 = 1250.75
    renderStrip({ carryOverMonthly: 500.75 });

    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250\.75/);
  });

  it("uses whole-krona display for whole remaining values", () => {
    renderStrip();

    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).not.toHaveTextContent(/1,250\.00/);
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250/);
  });

  it("exposes each breakdown term via a per-term testid", () => {
    renderStrip();

    expect(
      screen.getByTestId("savings-plan-balance-term-income"),
    ).toHaveTextContent(/30,000/);
    expect(
      screen.getByTestId("savings-plan-balance-term-carryOver"),
    ).toHaveTextContent(/500/);
    expect(
      screen.getByTestId("savings-plan-balance-term-expenses"),
    ).toHaveTextContent(/-?18,000/);
    expect(
      screen.getByTestId("savings-plan-balance-term-baseSavings"),
    ).toHaveTextContent(/-?4,000/);
    expect(
      screen.getByTestId("savings-plan-balance-term-goalSavings"),
    ).toHaveTextContent(/-?2,000/);
    expect(
      screen.getByTestId("savings-plan-balance-term-debtPayments"),
    ).toHaveTextContent(/-?5,250/);
    expect(
      screen.getByTestId("savings-plan-balance-term-remaining"),
    ).toHaveTextContent(/1,250/);
  });

  it("treats tiny floating-point residue as zero, not negative", () => {
    // 0.1 + 0.2 - 0.3 = ~5.55e-17 in JS. The strip should still read 'zero'.
    renderStrip({
      incomeMonthly: 0.1,
      carryOverMonthly: 0.2,
      expensesMonthly: 0.3,
      baseSavingsMonthly: 0,
      goalSavingsMonthly: 0,
      debtPaymentsMonthly: 0,
    });

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("zero");
  });
});
