import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

function waitForCloseResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      /\/api\/budgets?\/months\/[^/]+\/close\/?$/.test(url.pathname) &&
      response.request().method() === "POST"
    );
  });
}

test("balanced month can be closed and next month becomes active @smoke", async ({
  page,
}) => {
  await login(page, e2eUsers.closeBalanced);

  await expect(page.getByTestId("active-month-label")).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toBeEnabled();

  await page.getByTestId("close-month-cta").click();
  await expect(page.getByTestId("close-month-modal")).toBeVisible();

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("close-month-modal")).toBeHidden();
  await expect(page.getByTestId("active-month-label")).toContainText(
    /maj|may|2026/i,
  );
});
