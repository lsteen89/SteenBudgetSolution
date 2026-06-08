import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  april2026: /april 2026|aprill 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  // Surplus intro line 1: "You have {amount} left to handle." / "Du har {amount} kvar att hantera." / "Sul on veel {amount} jaotada."
  positiveHeadline: /left to handle|kvar att hantera|veel .* jaotada/i,
  // The redesigned 12-chapter modal explains the carry-forward choice through
  // the carry-over option card; the old `surplusIntroLine2` intro sentence
  // ("...carry it into next month...") is no longer rendered. Match the
  // carry-over option body, which states the amount becomes available next month.
  resolverBody:
    /becomes available in next month|tillgängligt i nästa månads plan|kättesaadavaks järgmise kuu/i,
  // Carry-over option label. The redesigned option card renders the kicker
  // ("Carry over" / "För över" / "Kanna üle") + a hero title ("{month} gets
  // +{amount}"), not the old `optionCarryOverTitle` ("Carry over to {month}").
  // The "references next month" check is covered separately by `may2026` below.
  carryOverOptionTitle:
    /Carry over|För över|Kanna üle/i,
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
  // Default selection is "keep in current month" (carryOverMode "none").
  await expect(modal.getByTestId("resolve-keep")).toHaveAttribute(
    "data-state",
    "selected",
  );
  await expect(modal.getByTestId("resolve-carry-over")).toBeVisible();
  await expect(modal.getByTestId("resolve-emergency-fund")).toHaveCount(0);

  // Switch to carry-over: the carry-over option is now selected and references May.
  await modal.getByTestId("resolve-carry-over").click();
  await expect(modal.getByTestId("resolve-carry-over")).toHaveAttribute(
    "data-state",
    "selected",
  );
  await expect(modal.getByTestId("resolve-carry-over")).toContainText(
    text.carryOverOptionTitle,
  );
  await expect(modal.getByTestId("resolve-carry-over")).toContainText(
    text.may2026,
  );

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.request().postDataJSON()).toMatchObject({
    carryOverMode: "full",
  });
  expect(closeResponse.ok()).toBeTruthy();
  await expect(modal).toBeHidden();

  // Land on the just-closed April recap with the "carried forward" handoff
  // card. Continuing from the card forwards to May.
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();

  const handoff = page.getByTestId("closed-month-handoff-card");
  await expect(handoff).toBeVisible();
  await expect(handoff).toHaveAttribute("data-variant", "positiveFull");
  await expect(handoff).toContainText(text.may2026);

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
