import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import MoneyState from "./MoneyState";
import { moneyStateDict } from "@/utils/i18n/pages/private/dashboard/openMonth/MoneyState.i18n";
import type { BudgetDashboardMonthDto } from "@/types/budget/BudgetDashboardMonthDto";

// Force a stable English locale so copy assertions don't drift with the
// system default. The component picks up the locale via `useAppLocale`.
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

/**
 * Build an open-month DTO with explicit, internally-reconciling terms so each
 * scenario controls exactly what `buildDashboardTerms` produces. `remaining`
 * is the backend value (`finalBalanceWithCarryMonthly`); the other terms feed
 * `income + carryOver - expenses - savings - debts = remaining`.
 */
function buildOpenMonthDto(overrides: {
  income?: number;
  carryOver?: number;
  expenses?: number;
  savings?: number;
  debts?: number;
  remaining: number;
}): BudgetDashboardMonthDto {
  const {
    income = 0,
    carryOver = 0,
    expenses = 0,
    savings = 0,
    debts = 0,
    remaining,
  } = overrides;

  return {
    currencyCode: "SEK",
    month: {
      yearMonth: "2026-04",
      status: "open",
      carryOverMode: "none",
      carryOverAmount: null,
      isCloseWindowOpen: false,
      closeWindowOpensAtUtc: null,
      closeEligibleAtUtc: null,
      isOverdueForClose: false,
    },
    liveDashboard: {
      budgetId: "00000000-0000-0000-0000-000000000001",
      income: {
        netSalaryMonthly: income,
        incomePaymentDayType: null,
        incomePaymentDay: null,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: income,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: {
        totalExpensesMonthly: expenses,
        byCategory: [],
      },
      savings: {
        monthlySavings: savings,
        totalGoalSavingsMonthly: 0,
        totalSavingsMonthly: savings,
        isMonthOnly: false,
        goals: [],
      },
      debt: {
        totalDebtBalance: 0,
        totalMonthlyPayments: debts,
        debts: [],
        repaymentStrategy: null,
      },
      carryOverAmountMonthly: carryOver,
      disposableAfterExpensesWithCarryMonthly: income + carryOver - expenses,
      disposableAfterExpensesAndSavingsWithCarryMonthly:
        income + carryOver - expenses - savings,
      finalBalanceWithCarryMonthly: remaining,
      recurringExpenses: [],
      subscriptions: {
        totalMonthlyAmount: 0,
        count: 0,
        items: [],
      },
    },
    snapshotTotals: null,
  };
}

function renderMoneyState(dto: BudgetDashboardMonthDto) {
  return render(
    <MemoryRouter>
      <MoneyState dashboardMonth={dto} currency="SEK" />
    </MemoryRouter>,
  );
}

// MoneyState logs a console.warn when client and backend disagree about
// remaining. Silence it during reconciling tests so the suite stays clean;
// the dedicated reconciliation test re-installs the spy.
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  warnSpy.mockClear();
});

describe("MoneyState — surplus", () => {
  it("anchors on backend remaining with positive tone and helper copy", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 12000,
        carryOver: 0,
        expenses: 8000,
        savings: 1000,
        debts: 500,
        remaining: 2500,
      }),
    );

    const anchor = screen.getByTestId("money-state");
    expect(anchor).toHaveAttribute("data-tone", "positive");

    const amount = screen.getByTestId("money-state-remaining");
    expect(amount.textContent ?? "").toMatch(/2,500/);
    expect(amount.textContent ?? "").not.toMatch(/^−/);

    expect(
      screen.getByText(moneyStateDict.en.helperPositive),
    ).toBeInTheDocument();

    // AllocationBar is present and not in deficit treatment.
    expect(screen.getByTestId("money-state-allocation")).toBeInTheDocument();
    expect(
      screen.queryByTestId("money-state-allocation-runs-out"),
    ).toBeNull();
  });

  it("renders the Open month kicker with the month's date range", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        expenses: 7000,
        savings: 500,
        debts: 0,
        remaining: 2500,
      }),
    );

    const kicker = screen.getByTestId("money-state-kicker");
    expect(kicker.textContent ?? "").toContain(
      moneyStateDict.en.kickerOpenMonth,
    );
    // yearMonth is 2026-04 → the en-US range mentions April and both endpoints.
    expect(kicker.textContent ?? "").toMatch(/April/);
    expect(kicker.textContent ?? "").toMatch(/1/);
    expect(kicker.textContent ?? "").toMatch(/30/);
  });

  it("does not render the six-term equation row (V2 PR2)", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        carryOver: 0,
        expenses: 7000,
        savings: 500,
        debts: 0,
        remaining: 2500,
      }),
    );

    expect(screen.queryByTestId("money-state-equation")).toBeNull();
  });
});

describe("MoneyState — zero", () => {
  it("uses zero tone and the zero-state helper copy", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 8000,
        carryOver: 0,
        expenses: 7000,
        savings: 1000,
        debts: 0,
        remaining: 0,
      }),
    );

    expect(screen.getByTestId("money-state")).toHaveAttribute(
      "data-tone",
      "zero",
    );
    expect(
      screen.getByText(moneyStateDict.en.helperZero),
    ).toBeInTheDocument();
    // No deficit marker at exactly zero.
    expect(
      screen.queryByTestId("money-state-allocation-runs-out"),
    ).toBeNull();
  });
});

describe("MoneyState — deficit", () => {
  it("renders danger tone, negative sign and the deficit helper", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        carryOver: 0,
        expenses: 11000,
        savings: 500,
        debts: 0,
        remaining: -1500,
      }),
    );

    expect(screen.getByTestId("money-state")).toHaveAttribute(
      "data-tone",
      "negative",
    );

    const amount = screen.getByTestId("money-state-remaining");
    expect(amount.textContent ?? "").toMatch(/1,500/);
    // Negative sign is presented as the minus glyph so the deficit is honest
    // without being shameful.
    expect(amount.textContent ?? "").toMatch(/^−/);

    expect(
      screen.getByText(moneyStateDict.en.helperNegative),
    ).toBeInTheDocument();

    // The AllocationBar surfaces the thin danger runs-out marker.
    expect(
      screen.getByTestId("money-state-allocation-runs-out"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("money-state-allocation-unfunded"),
    ).toBeNull();
  });
});

describe("MoneyState — tone word (DP3)", () => {
  it("shows the surplus tone word inline with the hero", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 12000,
        expenses: 8000,
        savings: 1000,
        debts: 500,
        remaining: 2500,
      }),
    );
    expect(screen.getByTestId("money-state-tone-word")).toHaveTextContent(
      moneyStateDict.en.toneWordPositive,
    );
  });

  it("shows the zero tone word at exactly zero remaining", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 8000,
        expenses: 7000,
        savings: 1000,
        debts: 0,
        remaining: 0,
      }),
    );
    expect(screen.getByTestId("money-state-tone-word")).toHaveTextContent(
      moneyStateDict.en.toneWordZero,
    );
  });

  it("shows the deficit tone word in danger tone", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        expenses: 11000,
        savings: 500,
        debts: 0,
        remaining: -1500,
      }),
    );
    expect(screen.getByTestId("money-state-tone-word")).toHaveTextContent(
      moneyStateDict.en.toneWordNegative,
    );
  });
});

describe("MoneyState — allocation legend", () => {
  it("lists a labelled, amount-bearing entry per visible segment, incl. free in surplus", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 12000,
        expenses: 8000,
        savings: 1000,
        debts: 500,
        remaining: 2500,
      }),
    );

    const legend = screen.getByTestId("money-state-allocation-legend");
    expect(
      within(legend).getByTestId("money-state-allocation-legend-expenses")
        .textContent ?? "",
    ).toMatch(/8,000/);
    expect(
      within(legend).getByTestId("money-state-allocation-legend-savings")
        .textContent ?? "",
    ).toMatch(/1,000/);
    expect(
      within(legend).getByTestId("money-state-allocation-legend-debts")
        .textContent ?? "",
    ).toMatch(/500/);
    expect(
      within(legend).getByTestId("money-state-allocation-legend-free")
        .textContent ?? "",
    ).toMatch(/2,500/);
  });

  it("omits the free entry and zero-width segments in a deficit", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        expenses: 11000,
        savings: 500,
        debts: 0,
        remaining: -1500,
      }),
    );

    const legend = screen.getByTestId("money-state-allocation-legend");
    expect(
      within(legend).getByTestId("money-state-allocation-legend-expenses"),
    ).toBeInTheDocument();
    // No free in a deficit, and the zero-debt segment is dropped (not a 0-amount row).
    expect(
      within(legend).queryByTestId("money-state-allocation-legend-free"),
    ).toBeNull();
    expect(
      within(legend).queryByTestId("money-state-allocation-legend-debts"),
    ).toBeNull();
  });
});

describe("MoneyState — breakdown ghost action", () => {
  it("routes to the breakdown page from the allocation header, with the short label", () => {
    renderMoneyState(
      buildOpenMonthDto({
        income: 12000,
        expenses: 8000,
        savings: 1000,
        debts: 500,
        remaining: 2500,
      }),
    );

    const link = screen.getByTestId("money-state-breakdown-link");
    expect(link).toHaveAttribute("href", "/dashboard/breakdown");
    expect(link).toHaveTextContent(moneyStateDict.en.breakdownLink);
    // The old large footer CTA copy is gone.
    expect(screen.queryByText("See the full breakdown")).toBeNull();
  });
});

describe("MoneyState — reconciliation diagnostics", () => {
  it("logs a console warning when backend remaining and client sum disagree", () => {
    // Hand-craft a DTO where the equation says +2,000 but backend says +500.
    renderMoneyState(
      buildOpenMonthDto({
        income: 10000,
        carryOver: 0,
        expenses: 7000,
        savings: 1000,
        debts: 0,
        remaining: 500,
      }),
    );

    expect(warnSpy).toHaveBeenCalled();
    const lastCall = warnSpy.mock.calls.at(-1) ?? [];
    expect(String(lastCall[0] ?? "")).toMatch(/does not reconcile/);

    // The displayed amount stays on backend remaining (500), not computed
    // (2,000) — the UI never overrides the backend with its own sum.
    const amount = screen.getByTestId("money-state-remaining");
    expect(amount.textContent ?? "").toMatch(/500/);
    expect(amount.textContent ?? "").not.toMatch(/2,000/);
  });
});

describe("MoneyState — i18n parity", () => {
  it("keeps sv/en/et keys aligned for the MoneyState dictionary", () => {
    const reference = Object.keys(moneyStateDict.sv).sort();
    expect(Object.keys(moneyStateDict.en).sort()).toEqual(reference);
    expect(Object.keys(moneyStateDict.et).sort()).toEqual(reference);
  });
});
