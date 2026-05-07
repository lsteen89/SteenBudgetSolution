import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  april2026: /april 2026|aprill 2026/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  february2026: /februari 2026|february 2026|veebruar 2026/i,
  january2026: /januari 2026|january 2026|jaanuar 2026/i,
  comparisonTab: /compare|jämför|võrdle/i,
  categoriesTab: /categories|kategorier|kategooriad/i,
  rentCategory: /rent|hyra|üür/i,
  foodCategory: /food|mat|toit/i,
  subscriptionCategory: /subscription|prenumerationer|tellimus/i,
  previousComparable:
    /previous closed month|föregående stängda månad|eelmine suletud kuu/i,
  signedIncrease: /\+/,
  signedDecrease: /[\-−]/,
};

async function expectClosedRecap(page: Page, month: RegExp) {
  const recap = page.getByTestId("closed-month-recap");

  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(month);
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  return recap;
}

test("comparison skip closed recap uses January after skipped February", async ({
  page,
}) => {
  // The recap-comparison-skip seed keeps February skipped. March must compare
  // to January, not February and not the no-previous-month fallback.
  await login(page, e2eUsers.recapComparisonSkip);

  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );

  await page.getByTestId("month-nav-previous").click();
  const marchRecap = await expectClosedRecap(page, text.march2026);

  await marchRecap.getByRole("tab", { name: text.comparisonTab }).click();
  const comparison = marchRecap.getByTestId("closed-month-comparison");
  await expect(comparison).toBeVisible();
  await expect(comparison).toContainText(text.previousComparable);
  await expect(comparison).toContainText(text.january2026);
  await expect(comparison).not.toContainText(text.february2026);
  await expect(
    comparison.getByTestId("closed-month-comparison-income"),
  ).toContainText(text.signedIncrease);
  await expect(
    comparison.getByTestId("closed-month-comparison-expenses"),
  ).toContainText(text.signedDecrease);
  await expect(
    comparison.getByTestId("closed-month-comparison-savings"),
  ).toContainText(text.signedIncrease);

  await marchRecap.getByRole("tab", { name: text.categoriesTab }).click();
  const categories = marchRecap.getByTestId("closed-month-expense-categories");
  await expect(categories).toBeVisible();
  await expect(categories.locator("div[data-tone]")).toHaveCount(5);
  await expect(categories).toContainText(text.rentCategory);
  await expect(categories).toContainText(text.foodCategory);
  await expect(categories).toContainText(text.subscriptionCategory);
  await expect(categories).toContainText(text.signedIncrease);
  await expect(categories).toContainText(text.signedDecrease);

  const savingsRows = marchRecap
    .getByTestId("closed-month-savings-detail")
    .locator('li[data-testid^="closed-month-savings-goal-"]');
  await expect(savingsRows.filter({ hasText: "Emergency Fund" })).toContainText(
    text.signedIncrease,
  );

  const debtRows = marchRecap
    .getByTestId("closed-month-debt-detail")
    .locator('li[data-testid^="closed-month-debt-"]');
  await expect(debtRows.filter({ hasText: "Credit Card" })).toContainText(
    text.signedIncrease,
  );

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.february2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.skippedStatus,
  );
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);

  await page.getByTestId("month-nav-previous").click();
  await expectClosedRecap(page, text.january2026);

  await page.getByTestId("month-nav-next").click();
  await expect(page.getByTestId("skipped-month-state")).toBeVisible();

  await page.getByTestId("month-nav-next").click();
  const returnedMarchRecap = await expectClosedRecap(page, text.march2026);
  await returnedMarchRecap
    .getByRole("tab", { name: text.comparisonTab })
    .click();
  await expect(
    returnedMarchRecap.getByTestId("closed-month-comparison"),
  ).toContainText(text.january2026);

  await returnedMarchRecap
    .getByRole("tab", { name: text.categoriesTab })
    .click();
  await expect(
    returnedMarchRecap
      .getByTestId("closed-month-expense-categories")
      .locator("div[data-tone]"),
  ).toHaveCount(5);
});
