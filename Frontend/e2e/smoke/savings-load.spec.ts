import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// Smoke coverage for /dashboard/savings.
//
// The seeded `savingsEditor` user opens the savings editor with:
//   - a non-zero base habit row,
//   - 3 active savings goals (Emergency Fund + Vacation Fund + Computer
//     Replacement),
//   - 2 plan-level savings methods (Sparkonto + ISK),
//   - income / expenses / debts so the balance strip has every term.
//
// The smoke is a shape check — that the MVP shell renders end-to-end against
// the real backend. Deeper assertions live in the savings/ folder specs.

test("seeded savings editor renders the MVP shell @smoke", async ({ page }) => {
  await login(page, e2eUsers.savingsEditor);

  await page.goto("/dashboard/savings");

  // Hero
  await expect(page.getByTestId("savings-hero-split")).toBeVisible();

  // Methods strip with at least one chip (seed provides Sparkonto + ISK).
  const methodsStrip = page.getByTestId("savings-methods-strip");
  await expect(methodsStrip).toBeVisible();
  await expect(
    methodsStrip.getByTestId("savings-methods-chip").first(),
  ).toBeVisible();

  // Bassparande row + balance strip.
  await expect(page.getByTestId("savings-base-habit-row")).toBeVisible();
  await expect(page.getByTestId("savings-plan-balance-strip")).toBeVisible();
  await expect(page.getByTestId("savings-plan-balance-headline")).toBeVisible();
  await expect(page.getByTestId("savings-plan-balance-chip")).toBeVisible();

  // Goal cards container + at least one card.
  const goalCards = page.getByTestId("savings-goal-cards");
  await expect(goalCards).toBeVisible();
  await expect(goalCards.getByTestId("savings-goal-card").first()).toBeVisible();

  // Tidigare mål section is intentionally NOT asserted here: the seed has no
  // completed/cancelled goals on first render so the section hides itself.
  // The goal-lifecycle spec exercises the toggle once a goal is completed.
});
