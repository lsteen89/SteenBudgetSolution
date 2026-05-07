import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  april2026: /april 2026|aprill 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  balancedHeadline: /perfect balance|perfekt balans|täiuslik tasakaal/i,
  balancedBody: /every krona|varje krona|iga kroon/i,
  balancedFooter: /ready to lock|redo att låsas|lukustamiseks valmis/i,
  noCarryOver:
    /nothing was carried into|ingen överföring följde med|ei kantud midagi üle/i,
  deficitGuidance:
    /deficit guidance|underskottsvägledning|puudujäägi juhis/i,
};

function waitForCloseResponse(page: Page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      /\/api\/budgets?\/months\/[^/]+\/close\/?$/.test(url.pathname) &&
      response.request().method() === "POST"
    );
  });
}

async function expectOpenApril(page: Page) {
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).not.toContainText(
    text.closedStatus,
  );
  await expect(page.getByTestId("month-status-badge")).not.toContainText(
    text.skippedStatus,
  );
  await expect(page.getByTestId("close-month-cta")).toBeEnabled();
}

test("close modal balanced user locks April without carry-over resolution", async ({
  page,
}) => {
  await login(page, e2eUsers.closeModalBalanced);
  await expectOpenApril(page);

  await page.getByTestId("close-month-cta").click();

  const modal = page.getByTestId("close-month-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(text.balancedHeadline);
  await expect(modal).toContainText(text.balancedBody);
  await expect(modal).toContainText(text.balancedFooter);
  await expect(modal.getByTestId("resolve-carry-over")).toHaveCount(0);
  await expect(modal.getByTestId("resolve-emergency-fund")).toHaveCount(0);

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.ok()).toBeTruthy();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.may2026,
  );

  await page.getByTestId("month-nav-previous").click();

  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );
  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toContainText(/0/);
  await expect(recap.getByTestId("closed-month-carry-over")).toContainText(
    text.noCarryOver,
  );
  await expect(
    recap.getByRole("article", { name: text.deficitGuidance }),
  ).toHaveCount(0);
});
