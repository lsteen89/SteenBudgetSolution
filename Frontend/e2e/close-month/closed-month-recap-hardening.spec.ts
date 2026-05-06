import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  skippedStatus: /^(Skipped|Hoppad över|Vahele jäetud)$/i,
  april2026: /april 2026|aprill 2026/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  february2026: /februari 2026|february 2026|veebruar 2026/i,
  january2026: /januari 2026|january 2026|jaanuar 2026/i,
  may2026: /maj 2026|may 2026|mai 2026/i,
  snapshotTotals:
    /snapshot totals|ögonblicksbildens totalsummor|hetkepildi kogusummad/i,
  noCarryOver:
    /no carry-over|nothing carried over|ingen överföring|ülekannet/i,
  comparisonTab: /compare|jämför|võrdle/i,
  categoriesTab: /categories|kategorier|kategooriad/i,
  previousComparable:
    /previous closed month|föregående stängda månad|eelmine suletud kuu/i,
  noPreviousCategory:
    /no previous month is available for category comparison|ingen tidigare månad finns för kategorijämförelse|varasemat kuud kategooriate võrdluseks ei ole/i,
  chartSwitcher: /choose chart view|välj diagramvy|vali diagrammivaade/i,
  categoryComparison:
    /categories are sorted|kategorier sorterade|kategooriad on järjestatud/i,
  subscriptionSection:
    /recurring costs|återkommande kostnader|korduvad kulud/i,
  subscriptionActive: /still active|fortfarande aktiva|endiselt aktiivsed/i,
  subscriptionNew: /new|nya|uued/i,
  deficitGuidance:
    /deficit guidance|underskottsvägledning|puudujäägi juhis/i,
  deficitTitle:
    /closed with a deficit|stängdes med underskott|suleti puudujäägiga/i,
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

async function expectOpenDashboard(
  page: Page,
  monthLabel = text.april2026,
  options: { expectCloseCta?: boolean } = {},
) {
  const { expectCloseCta = true } = options;

  await expect(page.getByTestId("active-month-label")).toContainText(
    monthLabel,
  );
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).not.toContainText(
    text.closedStatus,
  );
  await expect(page.getByTestId("month-status-badge")).not.toContainText(
    text.skippedStatus,
  );
  if (expectCloseCta) {
    await expect(page.getByTestId("close-month-cta")).toBeVisible();
  }
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
  await expect(page.getByTestId("skipped-month-state")).toHaveCount(0);
}

async function expectClosedRecap(page: Page, monthLabel: RegExp) {
  const recap = page.getByTestId("closed-month-recap");

  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    monthLabel,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );
  await expect(
    recap.getByRole("region", { name: text.snapshotTotals }),
  ).toBeVisible();
  await expect(recap.getByTestId("closed-month-summary")).toBeVisible();
  await expect(recap.getByTestId("closed-month-hero-flow")).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);

  return recap;
}

async function goToPreviousMonth(page: Page) {
  await page.getByTestId("month-nav-previous").click();
}

async function goToNextMonth(page: Page) {
  await page.getByTestId("month-nav-next").click();
}

test("traverses open, closed, skipped, and first closed month states", async ({
  page,
}) => {
  await login(page, e2eUsers.closeSurplusFull);

  await expectOpenDashboard(page);

  await goToPreviousMonth(page);
  await expectClosedRecap(page, text.march2026);

  await goToPreviousMonth(page);
  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.february2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.skippedStatus,
  );
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);

  await goToPreviousMonth(page);
  const firstClosedRecap = await expectClosedRecap(page, text.january2026);
  await expect(
    firstClosedRecap.getByTestId("closed-month-carry-over"),
  ).toHaveText(text.noCarryOver);
  await expect(
    firstClosedRecap.getByTestId("closed-month-chart-card"),
  ).toBeVisible();
  await expect(
    firstClosedRecap.getByTestId("closed-month-chart-tab-compare"),
  ).toHaveCount(0);
  await expect(
    firstClosedRecap.getByText(text.noPreviousCategory),
  ).toBeVisible();

  await goToNextMonth(page);
  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.february2026,
  );

  await goToNextMonth(page);
  await expectClosedRecap(page, text.march2026);

  await goToNextMonth(page);
  await expectOpenDashboard(page);
});

test("closed comparable month shows read-only recap, no carry-over, comparisons, and detail sections", async ({
  page,
}) => {
  await login(page, e2eUsers.closeSurplusFull);
  await goToPreviousMonth(page);

  const recap = await expectClosedRecap(page, text.march2026);
  await expect(recap.getByTestId("closed-month-hero-badge")).toContainText(
    text.closedStatus,
  );

  await expect(
    recap.getByTestId("closed-month-total-totalIncomeMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalExpensesMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalSavingsMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-total-totalDebtPaymentsMonthly"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toBeVisible();

  await expect(
    recap.getByRole("tablist", { name: text.chartSwitcher }),
  ).toBeVisible();
  await expect(recap.getByTestId("closed-month-carry-over")).toHaveText(
    text.noCarryOver,
  );
  await expect(recap.getByTestId("closed-month-hero-carry-over")).toBeVisible();

  await recap.getByRole("tab", { name: text.comparisonTab }).click();
  const comparison = recap.getByTestId("closed-month-comparison");
  await expect(comparison).toBeVisible();
  await expect(comparison.getByText(text.previousComparable)).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-comparison-income"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-comparison-expenses"),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-comparison-finalBalance"),
  ).toBeVisible();

  await recap.getByRole("tab", { name: text.categoriesTab }).click();
  await expect(
    recap.getByTestId("closed-month-expense-categories"),
  ).toBeVisible();
  await expect(recap.getByText(text.categoryComparison)).toBeVisible();

  await expect(
    recap.getByRole("article", { name: text.subscriptionSection }),
  ).toBeVisible();
  await expect(
    recap.getByTestId("closed-month-subscriptions-active"),
  ).toContainText(text.subscriptionActive);
  await expect(
    recap.getByTestId("closed-month-subscriptions-new"),
  ).toContainText(text.subscriptionNew);
  await expect(recap.getByTestId("closed-month-subscriptions")).toContainText(
    /Netflix|Spotify|Cloud Storage/i,
  );

  await expect(recap.getByTestId("closed-month-savings-detail")).toBeVisible();
  await expect(recap.getByTestId("closed-month-debt-detail")).toBeVisible();
});

test("closed deficit month displays calm deficit recap after end-to-end close", async ({
  page,
}) => {
  await login(page, e2eUsers.closeDeficit);
  await expectOpenDashboard(page);

  await page.getByTestId("close-month-cta").click();
  await expect(page.getByTestId("close-month-modal")).toBeVisible();
  await expect(page.getByTestId("close-month-modal")).toContainText(
    /overspent|överspenderad|miinuses/i,
  );

  const closeResponsePromise = waitForCloseResponse(page);
  await page.getByTestId("confirm-close-month").click();
  const closeResponse = await closeResponsePromise;

  expect(closeResponse.ok()).toBeTruthy();
  await expect(page.getByTestId("close-month-modal")).toBeHidden();
  await expectOpenDashboard(page, text.may2026, { expectCloseCta: false });

  await goToPreviousMonth(page);
  const recap = await expectClosedRecap(page, text.april2026);

  await expect(
    recap.getByTestId("closed-month-hero-flow-final-balance"),
  ).toContainText(/-|−|750/);

  const deficitGuidance = recap.getByRole("article", {
    name: text.deficitGuidance,
  });
  await expect(deficitGuidance).toContainText(text.deficitTitle);
  await expect(deficitGuidance).not.toContainText(
    /shame|blame|failed|bad|skäms|misslyckades/i,
  );
});
