import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { readMoneyTextByTestId } from "../helpers/money";

// Cross-page parity guard for the savings-total contract (PR-04).
//
// The dashboard's "Pengaläge" reads `FinalBalanceWithCarryMonthly` from the
// backend projector. The savings page derives its own "Kvar" from the six
// visible terms — `income + carry − expenses − base − goals − debts`. Under
// the goals-included contract these are arithmetically the same number, so
// the user must see the same amount on both surfaces.
//
// Under the prior contract (commits 84d008c8 / fff019ac, superseded
// 2026-05-24), the projector excluded goals while the savings page included
// them — devhistory@local.test April 2026 showed "Pengaläge +950 kr" vs
// "Kvar −3 050 kr" for the same month. If any future change ever re-derives
// money math on one surface in a way that drifts from the other, this spec
// fails for exactly the right reason.
//
// See docs/ai/ai-changelog.md (2026-05-24 supersede entry) and
// Work/Dashboard/savings/PR-04-savings-math-contract-tests.md for context.

test("dashboard Pengaläge equals savings page Kvar @smoke", async ({
  page,
}) => {
  await login(page, e2eUsers.savingsEditor);

  await page.goto("/dashboard");
  // The MoneyState refactor (dashboard polish, commit 08bf7f29 "MoneyState
  // anchor") renamed the remaining-anchor test id from
  // `dashboard-pengalage-amount` to `money-state-remaining`. Same backend value
  // (FinalBalanceWithCarryMonthly), same surface — only the hook id changed.
  const dashboardAmount = await readMoneyTextByTestId(
    page,
    "money-state-remaining",
  );

  await page.goto("/dashboard/savings");
  await expect(page.getByTestId("savings-plan-balance-strip")).toBeVisible();
  await expect(
    page.getByTestId("savings-plan-balance-breakdown"),
  ).toBeVisible();
  const savingsAmount = await readMoneyTextByTestId(
    page,
    "savings-plan-balance-term-remaining",
  );

  expect(savingsAmount).toBe(dashboardAmount);
});
