import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// Multi-locale text patterns. The seed locale is not pinned, so every label
// the spec asserts on must be tolerant of sv-SE / en-US / et-EE.
const text = {
  // Card adjust button on the savings goal card.
  adjust: /^(Justera|Adjust|Muuda)$/,
  // Save button in the Justera mål dialog.
  save: /^(Spara|Save|Salvesta)$/,
  // "Mark as completed" inside the contribution modal's more-actions row.
  complete: /^(Markera som uppnått|Mark as completed|Märgi saavutatuks)$/,
  // The lifecycle-confirm dialog's primary CTA (complete).
  confirmComplete:
    /^(Markera som uppnått|Mark as completed|Märgi saavutatuks)$/,
  // The Tidigare mål toggle aria-label (expanded form covers both states by
  // testid; the row status chip text is what we actually assert on).
  oldGoalCompletedStatus: /^(Uppnått|Completed|Saavutatud)$/,
};

// A target date six months out — well within the schema's allowed range and
// far enough that the seeded current month never collides with it.
function sixMonthsAheadIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

const NEW_GOAL_NAME = "E2E Goal Lifecycle";

test("create, adjust, then complete a savings goal end-to-end", async ({
  page,
}) => {
  await login(page, e2eUsers.savingsEditor);
  await page.goto("/dashboard/savings");

  // --- Create --------------------------------------------------------------
  await page.getByTestId("savings-goal-add-placeholder").click();
  const draft = page.getByTestId("savings-goal-draft-card");
  await expect(draft).toBeVisible();

  await page.locator("#savings-draft-name").fill(NEW_GOAL_NAME);
  await page.locator("#savings-draft-target-amount").fill("10000");
  await page.locator("#savings-draft-amount-saved").fill("500");
  await page.locator("#savings-draft-target-date").fill(sixMonthsAheadIso());

  await page.getByTestId("savings-draft-submit").click();
  await expect(draft).toHaveCount(0);

  // The new card appears in the goal cards list.
  const goalCards = page.getByTestId("savings-goal-cards");
  const newCard = goalCards
    .getByTestId("savings-goal-card")
    .filter({ hasText: NEW_GOAL_NAME });
  await expect(newCard).toHaveCount(1);

  // --- Adjust contribution -------------------------------------------------
  // Capture the balance strip's goalSavings term before the adjust so we can
  // prove the strip reacted to the PATCH (goal contributions feed
  // honestRemaining via the goalSavings term).
  const goalsTerm = page.getByTestId(
    "savings-plan-balance-term-goalSavings",
  );
  const goalsTermBefore = (await goalsTerm.textContent()) ?? "";

  await newCard.getByRole("button", { name: text.adjust }).click();
  const modalSnapshot = page.getByTestId("savings-goal-modal-snapshot");
  await expect(modalSnapshot).toBeVisible();

  await page.locator("#savings-amount").fill("750");
  // Save (the contribution modal's submit lives in the footer with
  // form="savings-goal-form"). The contribution modal closes on success.
  await page.locator('button[form="savings-goal-form"]').click();
  await expect(modalSnapshot).toHaveCount(0);

  // Card and balance strip both moved.
  await expect(newCard).toContainText(/750/);
  await expect(goalsTerm).not.toHaveText(goalsTermBefore);
  await expect(goalsTerm).toContainText(/750/);

  // --- Complete via the contribution modal's lifecycle action -------------
  await newCard.getByRole("button", { name: text.adjust }).click();
  await expect(modalSnapshot).toBeVisible();
  await page.getByRole("button", { name: text.complete }).click();

  const confirm = page.getByTestId("savings-lifecycle-confirm");
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: text.confirmComplete }).click();
  await expect(confirm).toHaveCount(0);
  await expect(modalSnapshot).toHaveCount(0);

  // The completed goal is gone from the active list and lives in Tidigare
  // mål once the section is expanded.
  await expect(
    goalCards
      .getByTestId("savings-goal-card")
      .filter({ hasText: NEW_GOAL_NAME }),
  ).toHaveCount(0);

  // The old-goals section hides itself when `rows.length === 0`, so it only
  // appears after the savings-old-goals query refetches with the newly
  // completed goal. React Query's invalidate + refetch is async — bump the
  // visibility timeout so the spec waits past a slow round-trip.
  const oldGoals = page.getByTestId("savings-old-goals-section");
  await expect(oldGoals).toBeVisible({ timeout: 15_000 });
  await oldGoals.getByTestId("savings-old-goals-toggle").click();
  const archivedRow = oldGoals
    .getByTestId("savings-old-goal-row")
    .filter({ hasText: NEW_GOAL_NAME });
  await expect(archivedRow).toHaveCount(1);
  await expect(
    archivedRow.getByTestId("savings-old-goal-status"),
  ).toContainText(text.oldGoalCompletedStatus);
});
