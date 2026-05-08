import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  april2026: /april 2026|aprill 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  // Calm "negativeNotice" copy: "This month is overspent by {amount}." / "Månaden är överspenderad med {amount}." / "See kuu on {amount} miinuses."
  overspentHeadline: /overspent|överspenderad|miinuses/i,
  noCarryOver:
    /nothing carried over|nothing was carried into|ingen överföring följde med|fördes inte vidare|ei kantud midagi üle/i,
  deficitGuidance:
    /deficit guidance|underskottsvägledning|puudujäägi juhis/i,
  deficitTitle:
    /closed with a deficit|stängdes med underskott|suleti puudujäägiga/i,
  deficitAmount: /750/,
  negativeSign: /-|−/,
  calmCopyGuard:
    /shame|blame|failed|failure|bad|skäms|misslyckades|misslyckande|dålig|häbi|süü|ebaõnnest|halb/i,
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

test("close modal deficit user locks April with calm deficit recap", async ({
  page,
}) => {
  await login(page, e2eUsers.closeModalDeficit);
  await expectOpenApril(page);

  await page.getByTestId("close-month-cta").click();

  const modal = page.getByTestId("close-month-modal");
  await expect(modal).toBeVisible();
  // Calm overspent notice surfaces in the modal; no surplus decision is shown.
  await expect(modal.getByTestId("close-month-negative-notice")).toContainText(
    text.overspentHeadline,
  );
  await expect(modal.getByTestId("resolve-carry-over")).toHaveCount(0);
  await expect(modal.getByTestId("resolve-keep")).toHaveCount(0);
  await expect(modal.getByTestId("resolve-emergency-fund")).toHaveCount(0);

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.request().postDataJSON()).toMatchObject({
    carryOverMode: "none",
  });
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

  const finalBalance = recap.getByTestId(
    "closed-month-hero-flow-final-balance",
  );
  await expect(finalBalance).toContainText(text.deficitAmount);
  await expect(finalBalance).toContainText(text.negativeSign);

  await expect(recap.getByTestId("closed-month-carry-over")).toContainText(
    text.noCarryOver,
  );
  await expect(recap.getByTestId("closed-month-hero-carry-over")).toContainText(
    text.noCarryOver,
  );

  const deficitGuidance = recap.getByRole("article", {
    name: text.deficitGuidance,
  });
  await expect(deficitGuidance).toContainText(text.deficitTitle);
  await expect(deficitGuidance).not.toContainText(text.calmCopyGuard);
});
