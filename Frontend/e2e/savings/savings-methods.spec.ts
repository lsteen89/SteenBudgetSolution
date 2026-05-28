import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// Savings methods strip — add via the editor's suggestion list, then remove
// the same row. The seeded user already has Sparkonto + ISK, so Funds and
// Cash are the suggestions on first open.

test("add a suggested savings method, then remove it", async ({ page }) => {
  await login(page, e2eUsers.savingsEditor);
  await page.goto("/dashboard/savings");

  const strip = page.getByTestId("savings-methods-strip");
  await expect(strip).toBeVisible();

  const chipsBefore = await strip
    .getByTestId("savings-methods-chip")
    .allTextContents();
  expect(chipsBefore.length).toBeGreaterThanOrEqual(2);

  // Open the editor.
  await strip.getByTestId("savings-methods-edit-action").click();
  const editor = page.getByTestId("savings-methods-editor");
  await expect(editor).toBeVisible();

  // Pick the first suggestion (Funds for the seeded user). Record the label
  // so we can match the chip and the row's remove button by exact text.
  const firstSuggestion = editor
    .getByTestId("savings-methods-suggestion")
    .first();
  const suggestionLabel = ((await firstSuggestion.textContent()) ?? "").trim();
  expect(suggestionLabel.length).toBeGreaterThan(0);

  await firstSuggestion.click();

  // The new chip is rendered by the strip behind the editor.
  await expect(
    strip
      .getByTestId("savings-methods-chip")
      .filter({ hasText: suggestionLabel }),
  ).toHaveCount(1);

  // Remove via the editor's row action.
  const row = editor.locator("li", { hasText: suggestionLabel });
  await expect(row).toHaveCount(1);
  await row.getByTestId("savings-methods-remove").click();

  // Chip is gone from the strip.
  await expect(
    strip
      .getByTestId("savings-methods-chip")
      .filter({ hasText: suggestionLabel }),
  ).toHaveCount(0);

  // Editor surfaced no error (the error node only renders when a mutation
  // fails — its absence is the success signal).
  await expect(editor.getByTestId("savings-methods-editor-error")).toHaveCount(
    0,
  );
});
