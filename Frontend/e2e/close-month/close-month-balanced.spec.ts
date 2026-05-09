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

test("balanced month closes onto a calm handoff and the CTA advances to next month @smoke", async ({
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

  // Land on the just-closed April recap with the calm handoff card; the
  // continue CTA forwards to May.
  await expect(page.getByTestId("active-month-label")).toContainText(
    /april|aprill/i,
  );
  const handoff = page.getByTestId("closed-month-handoff-card");
  await expect(handoff).toBeVisible();

  await handoff.getByTestId("closed-month-handoff-continue").click();
  await expect(page.getByTestId("active-month-label")).toContainText(
    /maj|may|mai/i,
  );
});
