import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  april2026: /april 2026|aprill 2026/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  february2026: /februari 2026|february 2026|veebruar 2026/i,
  january2026: /januari 2026|january 2026|jaanuar 2026/i,
  categoriesTab: /categories|kategorier|kategooriad/i,
  noPreviousCategory:
    /no previous month is available for category comparison|ingen tidigare månad finns för kategorijämförelse|varasemat kuud kategooriate võrdluseks ei ole/i,
  previousValue: /previous|föregående|eelmine/i,
  activeSubscriptions:
    /active subscriptions|aktiva abonnemang|aktiivsed tellimused/i,
  noCarryOver:
    /no carry-over to|nothing carried over|nothing was carried into|ingen överföring|ülekannet pole|ei kantud midagi üle/i,
  signedDelta: /[+\-−]/,
};

test("first closed recap renders without previous comparable month cues", async ({
  page,
}) => {
  // The recap-first-closed seed keeps January as the first closed month:
  // snapshot totals exist, but comparison data does not. The month is
  // balanced, so carry-over surfaces as no carry-over even though the shared
  // timeline still closes January before the skipped February row.
  await login(page, e2eUsers.recapFirstClosed);

  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.march2026,
  );

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.february2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.skippedStatus,
  );

  await page.getByTestId("month-nav-previous").click();
  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.january2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  await expect(
    recap.getByTestId("closed-month-total-totalIncomeMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalExpensesMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalSavingsMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalDebtPaymentsMonthly"),
  ).toBeVisible();

  await expect(
    recap.getByTestId("closed-month-chart-tab-compare"),
  ).toHaveCount(0);
  await expect(recap.getByRole("tab", { name: text.categoriesTab })).toHaveCount(
    0,
  );

  const categories = recap.getByTestId("closed-month-expense-categories");
  await expect(categories).toBeVisible();
  await expect(categories.getByText(text.noPreviousCategory)).toBeVisible();
  await expect(categories).toContainText(/starter rent|hyra|üür/i);
  await expect(categories).not.toContainText(text.previousValue);

  const subscriptions = recap.getByTestId("closed-month-subscriptions");
  await expect(subscriptions).toBeVisible();
  const activeSubscriptions = subscriptions.getByTestId(
    "closed-month-subscriptions-active",
  );
  await expect(activeSubscriptions).toContainText(text.activeSubscriptions);
  await expect(activeSubscriptions).toContainText("Cloud Backup");
  await expect(activeSubscriptions).toContainText("Streaming Essentials");
  await expect(
    subscriptions.getByTestId("closed-month-subscriptions-new"),
  ).toHaveCount(0);

  const savingsRows = recap
    .getByTestId("closed-month-savings-detail")
    .locator('li[data-testid^="closed-month-savings-goal-"]');
  await expect(savingsRows).toHaveCount(1);
  await expect(savingsRows.first()).toContainText("Emergency Buffer");
  await expect(savingsRows.first()).not.toContainText(text.signedDelta);

  const debtRows = recap
    .getByTestId("closed-month-debt-detail")
    .locator('li[data-testid^="closed-month-debt-"]');
  await expect(debtRows).toHaveCount(1);
  await expect(debtRows.first()).toContainText("Starter Credit Card");
  await expect(debtRows.first()).not.toContainText(text.signedDelta);

  await expect(recap.getByTestId("closed-month-hero-flow")).toContainText(
    text.noCarryOver,
  );
  await expect(recap.getByTestId("closed-month-carry-over")).toContainText(
    text.noCarryOver,
  );
});
