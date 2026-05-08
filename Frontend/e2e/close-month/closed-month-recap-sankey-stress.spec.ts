import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  categoriesTab: /categories|kategorier|kategooriad/i,
  currentOnlyCategory: "Current Only Category With A Very Long Sankey Stress Label",
  previousOnlyCategory: "Previous Only Category With A Very Long Archived Label",
  foodCategory: /food|mat|toit/i,
  carryOver: /carried into|följde med till|kanti üle kuusse/i,
  carryOverLabel: /carry-over|överför|üle/i,
  largeFinalBalance: /393[\s\u00a0.,]*750/,
};

test("closed comparable recap renders seeded Sankey/category stress data", async ({
  page,
}) => {
  // The recap-sankey-stress profile shapes 2026-03 vs 2026-01 so the recap
  // exercises large flow totals, full carry-over outcome display, long
  // category labels, current-only/previous-only categories, and deterministic
  // top expense increase drivers.
  await login(page, e2eUsers.recapSankeyStress);

  await page.getByTestId("month-nav-previous").click();
  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.march2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  await expect(recap.getByTestId("closed-month-hero-flow")).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toContainText(text.largeFinalBalance);

  const heroCarryOver = recap.getByTestId("closed-month-hero-carry-over");
  await expect(heroCarryOver).toBeVisible();
  await expect(heroCarryOver).toContainText(text.largeFinalBalance);

  const nextStepCarryOver = recap.getByTestId("closed-month-carry-over");
  await expect(nextStepCarryOver).toContainText(text.carryOver);
  await expect(nextStepCarryOver).toContainText(text.largeFinalBalance);

  const incomeCard = recap.getByTestId("closed-month-total-totalIncomeMonthly");
  await expect(incomeCard).toBeVisible();
  await expect(incomeCard).not.toContainText(text.largeFinalBalance);
  await expect(incomeCard).not.toContainText(text.carryOverLabel);

  const summary = recap.getByTestId("closed-month-summary");
  await expect(summary).toContainText(text.currentOnlyCategory);
  await expect(summary).toContainText(text.foodCategory);
  await expect(summary).toContainText(/64[\s\u00a0.,]*000/);
  await expect(summary).toContainText(/38[\s\u00a0.,]*000/);

  await recap.getByRole("tab", { name: text.categoriesTab }).click();
  const categories = recap.getByTestId("closed-month-expense-categories");
  await expect(categories).toBeVisible();
  await expect(categories).toContainText(text.currentOnlyCategory);
  await expect(categories).toContainText(text.previousOnlyCategory);
});
