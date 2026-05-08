import type { Browser, Page, Response } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

type DashboardMonthDto = {
  month: {
    yearMonth: string;
    carryOverAmount: number | null;
  };
  liveDashboard: {
    income: { totalIncomeMonthly: number };
    expenditure: { totalExpensesMonthly: number };
    savings: { totalSavingsMonthly: number };
    debt: { totalMonthlyPayments: number };
    carryOverAmountMonthly: number;
    finalBalanceWithCarryMonthly: number;
  } | null;
};

type CloseBudgetMonthResultDto = {
  snapshotTotals: {
    finalBalanceMonthly: number;
  };
  nextMonth: {
    yearMonth: string;
    carryOverMode: "none" | "full";
    carryOverAmount: number | null;
  };
};

function waitForCloseResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      /\/api\/budgets?\/months\/[^/]+\/close\/?$/.test(url.pathname) &&
      response.request().method() === "POST"
    );
  });
}

function waitForDashboardResponse(page: Page, yearMonth?: string) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    const matchesYearMonth =
      yearMonth === undefined || url.searchParams.get("yearMonth") === yearMonth;

    return (
      url.pathname === "/api/budgets/dashboard" &&
      response.request().method() === "GET" &&
      matchesYearMonth
    );
  });
}

async function readEnvelopeData<T>(response: Response): Promise<T> {
  expect(response.ok()).toBeTruthy();

  const json = await response.json();
  return (json.data ?? json) as T;
}

// Round to whole öre (2 decimal places) before comparing. The backend rounds
// each money value with MoneyRound.Kr, but recomputing the expected balance in
// JavaScript via raw subtraction can produce 1250.000000000001 etc. due to
// IEEE-754 drift. Comparing rounded cents avoids the false negative without
// weakening the invariant the assertion is meant to express.
function roundOre(value: number) {
  return Math.round(value * 100) / 100;
}

function expectDashboardMathToReconcile(dto: DashboardMonthDto) {
  const live = dto.liveDashboard;
  expect(live).not.toBeNull();

  const expected = roundOre(
    live!.carryOverAmountMonthly +
      live!.income.totalIncomeMonthly -
      live!.expenditure.totalExpensesMonthly -
      live!.savings.totalSavingsMonthly -
      live!.debt.totalMonthlyPayments,
  );

  expect(roundOre(live!.finalBalanceWithCarryMonthly)).toBe(expected);
}

async function expectIncomingCarryOverRow(page: Page) {
  await expect(page.getByText(/ingående överföring/i)).toBeVisible();
}

async function loginWithInitialDashboard(
  browser: Browser,
  user: typeof e2eUsers.login,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const dashboardResponsePromise = waitForDashboardResponse(page);

  await login(page, user);

  const dashboard = await readEnvelopeData<DashboardMonthDto>(
    await dashboardResponsePromise,
  );

  return { context, page, dashboard };
}

test("carry-over dashboard math reconciles after full close @smoke", async ({
  browser,
}, testInfo) => {
  testInfo.setTimeout(45_000);

  const full = await loginWithInitialDashboard(
    browser,
    e2eUsers.closeModalSurplusCarryover,
  );

  try {
    expect(full.dashboard.month.yearMonth).toBe("2026-04");
    expect(full.dashboard.liveDashboard!.carryOverAmountMonthly).toBeGreaterThan(
      0,
    );
    expectDashboardMathToReconcile(full.dashboard);
    await expectIncomingCarryOverRow(full.page);

    await full.page.getByTestId("close-month-cta").click();
    const fullModal = full.page.getByTestId("close-month-modal");
    await expect(fullModal).toBeVisible();
    await fullModal.getByTestId("resolve-carry-over").click();

    const closeResponsePromise = waitForCloseResponse(full.page);
    const mayDashboardResponsePromise = waitForDashboardResponse(
      full.page,
      "2026-05",
    );
    await full.page.getByTestId("confirm-close-month").click();

    const fullClose = await readEnvelopeData<CloseBudgetMonthResultDto>(
      await closeResponsePromise,
    );
    expect(fullClose.nextMonth).toMatchObject({
      yearMonth: "2026-05",
      carryOverMode: "full",
    });
    expect(fullClose.nextMonth.carryOverAmount).toBe(
      fullClose.snapshotTotals.finalBalanceMonthly,
    );

    const mayDashboard = await readEnvelopeData<DashboardMonthDto>(
      await mayDashboardResponsePromise,
    );
    expect(mayDashboard.month.yearMonth).toBe("2026-05");
    expect(mayDashboard.month.carryOverAmount).toBe(
      fullClose.nextMonth.carryOverAmount,
    );
    expect(mayDashboard.liveDashboard!.carryOverAmountMonthly).toBe(
      fullClose.nextMonth.carryOverAmount,
    );
    expectDashboardMathToReconcile(mayDashboard);
    await expectIncomingCarryOverRow(full.page);
  } finally {
    await full.context.close();
  }
});
