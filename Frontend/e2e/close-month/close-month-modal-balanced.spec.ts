import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  april2026: /april 2026|aprill 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  // Modal title for the closing month — same in every locale via the shared snapshotLabel + month label.
  modalTitle: /Close april 2026|Stäng april 2026|Sulge april 2026/i,
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
  await expect(modal).toContainText(text.modalTitle);
  // Balanced months show no surplus decision and no overspent notice.
  await expect(modal.getByTestId("resolve-carry-over")).toHaveCount(0);
  await expect(modal.getByTestId("resolve-keep")).toHaveCount(0);
  await expect(modal.getByTestId("resolve-emergency-fund")).toHaveCount(0);
  await expect(modal.getByTestId("close-month-negative-notice")).toHaveCount(0);

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.ok()).toBeTruthy();
  await expect(modal).toBeHidden();

  // After close we land on the just-closed April recap with the calm handoff
  // card. Continuing then forwards to May.
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.april2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toContainText(/0/);
  await expect(recap.getByTestId("closed-month-carry-over")).toContainText(
    text.noCarryOver,
  );
  await expect(
    recap.getByRole("article", { name: text.deficitGuidance }),
  ).toHaveCount(0);

  const handoff = page.getByTestId("closed-month-handoff-card");
  await expect(handoff).toBeVisible();
  await expect(handoff).toHaveAttribute("data-variant", "balanced");

  await handoff.getByTestId("closed-month-handoff-continue").click();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.may2026,
  );
});
