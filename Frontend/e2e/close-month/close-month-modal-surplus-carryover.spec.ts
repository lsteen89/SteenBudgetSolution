import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  april2026: /april 2026|aprill 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  positiveHeadline: /left to allocate|kvar att fördela|jaotamata/i,
  resolverBody: /handle this surplus|hantera överskottet|ülejäägi lahendada/i,
  resolvedCarryOverHeadline:
    /will carry over to|kommer att föras över till|kantakse üle kuusse/i,
  resolvedCarryOverBody:
    /surplus will move forward|överskottet förs vidare|ülejääk liigub edasi/i,
  resolvedCarryOverFooter:
    /will carry over into|förs över till|kantakse kuusse .* üle/i,
  deficitGuidance:
    /deficit guidance|underskottsvägledning|puudujäägi juhis/i,
  positiveFinalBalance: /1(?:[\s.,\u00a0])?250|1250/,
  appliedCarryOver:
    /carried into|följde med till|överfört till|kanti üle kuusse|üle kantud kuusse/i,
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

test("close modal carry-over user moves April surplus into May", async ({
  page,
}) => {
  await login(page, e2eUsers.closeModalSurplusCarryover);
  await expectOpenApril(page);

  await page.getByTestId("close-month-cta").click();

  const modal = page.getByTestId("close-month-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(text.positiveHeadline);
  await expect(modal).toContainText(text.resolverBody);
  await expect(modal.getByTestId("resolve-carry-over")).toBeVisible();
  await expect(modal.getByTestId("resolve-emergency-fund")).toHaveCount(0);

  await modal.getByTestId("resolve-carry-over").click();
  await expect(modal).toContainText(text.resolvedCarryOverHeadline);
  await expect(modal).toContainText(text.resolvedCarryOverBody);
  await expect(modal).toContainText(text.resolvedCarryOverFooter);
  await expect(modal).toContainText(text.positiveFinalBalance);
  await expect(modal).toContainText(text.may2026);

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.request().postDataJSON()).toMatchObject({
    carryOverMode: "full",
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
  await expect(finalBalance).toContainText(text.positiveFinalBalance);
  await expect(finalBalance).not.toContainText(/-|−/);

  const carryOver = recap.getByTestId("closed-month-carry-over");
  await expect(carryOver).toContainText(text.appliedCarryOver);
  await expect(carryOver).toContainText(text.positiveFinalBalance);
  await expect(carryOver).toContainText(text.may2026);

  const heroCarryOver = recap.getByTestId("closed-month-hero-carry-over");
  await expect(heroCarryOver).toContainText(text.appliedCarryOver);
  await expect(heroCarryOver).toContainText(text.positiveFinalBalance);
  await expect(heroCarryOver).toContainText(text.may2026);
  await expect(
    recap.getByRole("article", { name: text.deficitGuidance }),
  ).toHaveCount(0);
});
