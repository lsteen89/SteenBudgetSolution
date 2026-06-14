import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// The seeded open month and the month the plan flow materialises from it.
const FROM_YEAR_MONTH = "2026-04";
const PLANNED_YEAR_MONTH = "2026-05";

function waitForPlanResponse(page: Page) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/budgets/months/${FROM_YEAR_MONTH}/next-planned` &&
      response.request().method() === "POST",
  );
}

// Happy-path slice of the next-month workspace: a seeded open month projects a
// preview, the user creates the planned month, and one pillar opens its editor
// scoped to that planned month. Uses a dedicated, never-shared fixture because
// the flow mutates state (it materialises 2026-05).
test("plan next month from preview, then edit a planned pillar @smoke", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);

  await login(page, e2eUsers.nextMonthPlan);
  await page.goto("/dashboard/next-month");

  // Preview state: nothing saved yet, projected from the budget plan.
  await expect(page.getByTestId("next-month-preview-title")).toBeVisible();
  await expect(page.getByTestId("next-month-preview")).toBeVisible();

  // Start planning -> confirmation modal -> create the planned month.
  await page.getByTestId("next-month-start-planning-action").click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();

  const planResponsePromise = waitForPlanResponse(page);
  await confirmDialog.getByTestId("next-month-confirm-create").click();
  expect((await planResponsePromise).ok()).toBeTruthy();

  // Planned state: the quiet success banner and the pillar edit hub.
  await expect(page.getByTestId("next-month-planned-success")).toBeVisible();
  await expect(page.getByTestId("next-month-edit-actions")).toBeVisible();

  // Enter one pillar editor; it must be scoped to the planned month.
  await page.getByTestId("next-month-edit-income").click();

  await expect(page).toHaveURL(
    new RegExp(`/dashboard/income\\?yearMonth=${PLANNED_YEAR_MONTH}`),
  );

  // The off-open-month banner confirms the editor targets the planned month.
  const banner = page.getByTestId("selected-month-banner");
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute("data-month-status", "planned");
});
