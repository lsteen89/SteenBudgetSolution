import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const traversalUser = e2eUsers.closeSurplusFull;

const recapText = {
  closed: /^(Closed|Stängd|Suletud)$/,
  income: /Income|Inkomst|Sissetulek/i,
  incomeArticle:
    /income snapshot total|inkomst i ögonblicksbild|sissetulek salvestatud kogusumma/i,
  expenses: /Expenses|Utgifter|Kulud/i,
  expensesArticle:
    /expenses snapshot total|utgifter i ögonblicksbild|kulud salvestatud kogusumma/i,
  savings: /Savings|Sparande|Säästud/i,
  savingsArticle:
    /savings snapshot total|sparande i ögonblicksbild|säästud salvestatud kogusumma/i,
  debtPayments: /Debt payments|Skuldbetalningar|Võlamaksed/i,
  debtPaymentsArticle:
    /debt payments snapshot total|skuldbetalningar i ögonblicksbild|võlamaksed salvestatud kogusumma/i,
  finalBalance: /Final balance|Slutsaldo|Lõppsaldo/i,
  carryOver:
    /Carry-over|No carry-over|not carried into the next month|Överföring|Ingen överföring|fördes inte vidare|Ülekanne|Ülekannet|ei kantud järgmisse kuusse/i,
  edit: /^(edit|redigera|muuda)$/i,
  addExpense: /add expense|lägg till utgift|lisa kulu/i,
  closeMonth: /close month|stäng månad|sulge kuu/i,
  skippedBody:
    /no budget was closed|ingen budget stängdes|selle perioodi eelarvet ei suletud/i,
};

test("seeded budget user lands on an open dashboard @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await expect(page.getByTestId("active-month-label")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toBeVisible();
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
  await expect(page.getByTestId("skipped-month-state")).toHaveCount(0);
});

test("seeded closed month renders recap shell @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await page.getByTestId("month-nav-previous").click();

  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).toContainText(
    recapText.closed,
  );

  const incomeCard = recap.getByRole("article", {
    name: recapText.incomeArticle,
  });
  await expect(incomeCard).toContainText(recapText.income);
  await expect(incomeCard).not.toContainText(recapText.carryOver);
  await expect(
    recap.getByRole("article", { name: recapText.expensesArticle }),
  ).toContainText(recapText.expenses);
  await expect(
    recap.getByRole("article", { name: recapText.savingsArticle }),
  ).toContainText(recapText.savings);
  await expect(
    recap.getByRole("article", { name: recapText.debtPaymentsArticle }),
  ).toContainText(recapText.debtPayments);
  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toContainText(recapText.finalBalance);

  await expect(
    recap.getByTestId("closed-month-hero-carry-over"),
  ).toContainText(recapText.carryOver);
  await expect(recap.getByTestId("closed-month-chart-card")).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-expense-categories"),
  ).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);
  await expect(recap.getByRole("button", { name: recapText.edit })).toHaveCount(
    0,
  );
  await expect(
    recap.getByRole("button", { name: recapText.addExpense }),
  ).toHaveCount(0);
  await expect(
    recap.getByRole("button", { name: recapText.closeMonth }),
  ).toHaveCount(0);
});

test("seeded skipped month renders skipped shell @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("closed-month-recap")).toBeVisible();

  await page.getByTestId("month-nav-previous").click();

  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expect(page.getByText(recapText.skippedBody)).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
});
