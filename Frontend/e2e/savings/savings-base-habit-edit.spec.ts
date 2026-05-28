import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// Bassparande dialog coverage.
//
// The base-savings PATCH endpoint accepts three scopes:
//   - currentMonthOnly        — writes BudgetMonthSavings only
//   - currentMonthAndBudgetPlan — writes BudgetMonthSavings + Savings
//   - budgetPlanOnly          — writes Savings only
//
// Orphan rule: when BudgetMonthSavings.SourceSavingsId IS NULL, the response
// carries IsMonthOnly = true and the dialog disables both plan-scope cards.
// This spec uses the `savingsEditor` user for the happy path and the
// `savingsOrphan` user for the orphan assertion.

async function openBaseHabitDialog(page: Page): Promise<void> {
  await page.goto("/dashboard/savings");
  await expect(page.getByTestId("savings-base-habit-row")).toBeVisible();
  // The dialog reads `isMonthOnly` from the dashboard query — wait for the
  // balance strip (which only renders once `dashboardAggregate` is non-null)
  // so the orphan signal has reached the React tree before we open the
  // dialog. Otherwise the dialog initialises with stale defaults.
  await expect(page.getByTestId("savings-plan-balance-strip")).toBeVisible();
  await page.getByTestId("savings-base-habit-edit-action").click();
  await expect(page.getByTestId("savings-base-habit-scope")).toBeVisible();
}

async function fillAndSave(page: Page, amount: string): Promise<void> {
  const input = page.locator("#savings-base-habit-amount");
  await expect(input).toBeVisible();
  await input.fill(amount);
  // The dialog submit lives in a portal footer with form="savings-base-habit-form".
  await page.locator('button[form="savings-base-habit-form"]').click();
  // Dialog dismisses on success — assert the scope toggle is gone before we
  // start asserting on the page underneath it.
  await expect(page.getByTestId("savings-base-habit-scope")).toHaveCount(0);
}

test.describe("savings editor — Bassparande dialog", () => {
  test("currentMonthOnly write updates the row and balance strip", async ({
    page,
  }) => {
    await login(page, e2eUsers.savingsEditor);
    await openBaseHabitDialog(page);

    // All three scopes are present and enabled for the plan-linked user.
    await expect(
      page.getByTestId("savings-base-habit-scope-currentMonthOnly"),
    ).toBeEnabled();
    await expect(
      page.getByTestId("savings-base-habit-scope-currentMonthAndBudgetPlan"),
    ).toBeEnabled();
    await expect(
      page.getByTestId("savings-base-habit-scope-budgetPlanOnly"),
    ).toBeEnabled();

    // Capture the bassparande term in the balance strip before editing so we
    // can prove the strip reacted to the write (the strip's baseSavings term
    // and the bassparande row are driven by the same dashboard query, so a
    // PATCH that hits BudgetMonthSavings must move both).
    const balanceTerm = page.getByTestId(
      "savings-plan-balance-term-baseSavings",
    );
    await expect(balanceTerm).toBeVisible();
    const beforeBalance = (await balanceTerm.textContent()) ?? "";

    // currentMonthOnly write.
    await page
      .getByTestId("savings-base-habit-scope-currentMonthOnly")
      .click();
    await fillAndSave(page, "2200");

    // Bassparande row reflects the new base amount.
    await expect(page.getByTestId("savings-base-habit-amount")).toContainText(
      /2[\s  ]?200/,
    );
    // Balance strip baseSavings term has moved (still negative — it's a
    // spend in the six-term identity).
    await expect(balanceTerm).not.toHaveText(beforeBalance);
    await expect(balanceTerm).toContainText(/2[\s  ]?200/);
  });

  test("currentMonthAndBudgetPlan write succeeds for plan-linked user", async ({
    page,
  }) => {
    await login(page, e2eUsers.savingsEditor);
    await openBaseHabitDialog(page);

    // The dialog defaults to currentMonthAndBudgetPlan for plan-linked users.
    // Explicitly re-select it so the test states the contract.
    await page
      .getByTestId("savings-base-habit-scope-currentMonthAndBudgetPlan")
      .click();

    await fillAndSave(page, "2500");

    await expect(page.getByTestId("savings-base-habit-amount")).toContainText(
      /2[\s  ]?500/,
    );
    await expect(
      page.getByTestId("savings-plan-balance-term-baseSavings"),
    ).toContainText(/2[\s  ]?500/);
  });

  test("orphan user has plan-scope cards disabled", async ({ page }) => {
    // The orphan seed makes BudgetMonthSavings.SourceSavingsId NULL for the
    // open month, so the dashboard returns IsMonthOnly = true and the dialog
    // refuses to offer plan-scope writes (the backend would reject them with
    // BaseSavings.PlanMissing anyway).
    await login(page, e2eUsers.savingsOrphan);
    await openBaseHabitDialog(page);

    await expect(
      page.getByTestId("savings-base-habit-scope-currentMonthOnly"),
    ).toBeEnabled();
    await expect(
      page.getByTestId("savings-base-habit-scope-currentMonthAndBudgetPlan"),
    ).toBeDisabled();
    await expect(
      page.getByTestId("savings-base-habit-scope-budgetPlanOnly"),
    ).toBeDisabled();

    // currentMonthOnly still works — the orphan can keep editing the
    // month-only value.
    await fillAndSave(page, "950");
    await expect(page.getByTestId("savings-base-habit-amount")).toContainText(
      /950/,
    );
  });
});
