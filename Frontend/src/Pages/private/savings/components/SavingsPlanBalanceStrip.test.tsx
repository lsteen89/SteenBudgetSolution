import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SavingsPlanBalanceStrip, {
  type SavingsPlanBalanceStripProps,
} from "./SavingsPlanBalanceStrip";

const renderStrip = (
  override: Partial<SavingsPlanBalanceStripProps> = {},
) => {
  const props: SavingsPlanBalanceStripProps = {
    currencyCode: "SEK",
    locale: "en-US",
    remainingToSpend: 1250,
    incomeMonthly: 30000,
    carryOverMonthly: 500,
    expensesMonthly: 18000,
    savingsMonthly: 6000,
    debtPaymentsMonthly: 5250,
    ...override,
  };
  return render(<SavingsPlanBalanceStrip {...props} />);
};

describe("SavingsPlanBalanceStrip", () => {
  it("renders the positive balance state with the 'in balance' chip", () => {
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
    renderStrip({ remainingToSpend: 0 });

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("zero");
    expect(
      screen.getByTestId("savings-plan-balance-message"),
    ).toHaveTextContent(/uses the full month room/i);
  });

  it("renders the negative balance state with calm adjustment copy (no red)", () => {
    renderStrip({ remainingToSpend: -850 });

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
    renderStrip({ remainingToSpend: 1250.75 });

    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250\.75/);
  });

  it("uses whole-krona display for whole remaining values", () => {
    renderStrip({ remainingToSpend: 1250 });

    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).not.toHaveTextContent(/1,250\.00/);
    expect(
      screen.getByTestId("savings-plan-balance-headline"),
    ).toHaveTextContent(/1,250/);
  });

  it("renders the income+carry-in breakdown from dashboard-derived values", () => {
    renderStrip({
      incomeMonthly: 30000,
      carryOverMonthly: 500,
      expensesMonthly: 18000,
      savingsMonthly: 6000,
      debtPaymentsMonthly: 5250,
      remainingToSpend: 1250,
    });

    const breakdown = screen.getByTestId("savings-plan-balance-breakdown");
    const incomeRow = within(breakdown).getByText(/Income \+ carry-in/i)
      .parentElement!;
    expect(incomeRow).toHaveTextContent(/30,500/); // 30000 + 500

    const expensesRow = within(breakdown).getByText(/^Expenses$/i)
      .parentElement!;
    expect(expensesRow).toHaveTextContent(/-?18,000/);

    const savingsRow = within(breakdown).getByText(/^Savings$/i)
      .parentElement!;
    expect(savingsRow).toHaveTextContent(/-?6,000/);

    const debtsRow = within(breakdown).getByText(/^Debts$/i).parentElement!;
    expect(debtsRow).toHaveTextContent(/-?5,250/);

    const leftRow = within(breakdown).getByText(/^Left$/i).parentElement!;
    expect(leftRow).toHaveTextContent(/1,250/);
  });

  it("treats tiny floating-point residue as zero, not negative", () => {
    // 0.1 + 0.2 - 0.3 = ~5.55e-17 in JS. The strip should still read 'zero'.
    renderStrip({ remainingToSpend: 0.1 + 0.2 - 0.3 });

    const strip = screen.getByTestId("savings-plan-balance-strip");
    expect(strip.dataset.tone).toBe("zero");
  });
});
