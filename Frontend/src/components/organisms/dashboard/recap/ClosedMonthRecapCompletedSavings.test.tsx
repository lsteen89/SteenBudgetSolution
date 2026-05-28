import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompletedSavingsGoalsBlock } from "./ClosedMonthRecapDetailBlocks";
import type {
  BudgetMonthRecapDto,
  BudgetMonthRecapCompletedSavingsGoalDto,
} from "@/types/budget/BudgetMonthRecapDto";
import { closedMonthRecapDict } from "@/utils/i18n/pages/private/dashboard/recap/ClosedMonthRecapSection.i18n";
import { tDict } from "@/utils/i18n/translate";

type RecapTKey = keyof typeof closedMonthRecapDict.sv;

function t<K extends RecapTKey>(key: K) {
  return tDict(key, "en", closedMonthRecapDict);
}

function buildRecap(
  completedGoals: BudgetMonthRecapCompletedSavingsGoalDto[],
): BudgetMonthRecapDto {
  return {
    month: {
      yearMonth: "2026-04",
      status: "closed",
      openedAtUtc: "2026-04-01T00:00:00Z",
      closedAtUtc: "2026-04-30T00:00:00Z",
      carryOverMode: "none",
      carryOverAmount: null,
    },
    snapshotTotals: {
      totalIncomeMonthly: 0,
      totalExpensesMonthly: 0,
      totalSavingsMonthly: 0,
      totalDebtPaymentsMonthly: 0,
      finalBalanceMonthly: 0,
    },
    comparison: {
      previousComparableYearMonth: null,
      hasPreviousComparableMonth: false,
      summary: null,
    },
    expenseCategories: [],
    subscriptionInsight: {
      active: [],
      new: [],
      removed: [],
      paused: [],
      cancelled: [],
      hasPreviousComparableMonth: false,
    },
    savingsDetail: {
      totalSavingsMonthly: 0,
      activeGoals: [],
      completedGoals,
      hasPreviousComparableMonth: false,
    },
    debtDetail: {
      totalDebtPaymentsMonthly: 0,
      activeDebts: [],
      hasPreviousComparableMonth: false,
    },
    insightDrivers: {
      expenseIncreaseDrivers: [],
      largestExpenseIncreaseDriver: null,
    },
    carryOverOutcome: {
      mode: "none",
      amount: 0,
      targetYearMonth: null,
      wasApplied: false,
    },
  };
}

describe("CompletedSavingsGoalsBlock", () => {
  it("renders completed savings goals when present", () => {
    const recap = buildRecap([
      {
        id: "goal-a",
        name: "Buffert",
        targetAmount: 10000,
        amountSaved: 9500,
        monthlyContribution: 500,
        projectedAmountSaved: 10000,
        closedAt: "2026-04-30T00:00:00Z",
      },
    ]);

    render(
      <CompletedSavingsGoalsBlock
        recap={recap}
        currency="SEK"
        locale="en"
        t={t}
      />,
    );

    const block = screen.getByTestId(
      "closed-month-completed-savings-goals",
    );
    expect(block).toBeInTheDocument();
    expect(
      screen.getByTestId("closed-month-completed-savings-goal-goal-a"),
    ).toBeInTheDocument();
    expect(block).toHaveTextContent(/Buffert reached its goal this month/i);
  });

  it("renders nothing when there are no completed goals", () => {
    const recap = buildRecap([]);

    const { container } = render(
      <CompletedSavingsGoalsBlock
        recap={recap}
        currency="SEK"
        locale="en"
        t={t}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("uses projectedAmountSaved (not raw amountSaved) as the reached amount", () => {
    const recap = buildRecap([
      {
        id: "goal-b",
        name: "Resa",
        targetAmount: 4000,
        // Raw stored progression: 3800. Must NOT render as the final reached value.
        amountSaved: 3800,
        monthlyContribution: 250,
        // Projected = 3800 + 250 = 4050 — the canonical "reached this month" value.
        projectedAmountSaved: 4050,
        closedAt: "2026-04-30T00:00:00Z",
      },
    ]);

    render(
      <CompletedSavingsGoalsBlock
        recap={recap}
        currency="SEK"
        locale="en"
        t={t}
      />,
    );

    const row = screen.getByTestId("closed-month-completed-savings-goal-goal-b");
    // The reached label must surface 4050, not 3800.
    expect(within(row).getByText(/4,050/)).toBeInTheDocument();
    expect(within(row).queryByText(/3,800/)).toBeNull();
  });
});
