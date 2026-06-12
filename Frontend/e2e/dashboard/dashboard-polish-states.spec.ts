import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

/**
 * DP5 — dashboard visual-polish state matrix (full project).
 *
 * Locks the non-happy-path treatments of the polished open-month dashboard and
 * the read-only enforcement that the polish must not regress:
 *
 *  - deficit   — red anchor + "short", the AllocationBar runs-out marker and the
 *                hatched unfunded tail (DP2 deficit honesty, unchanged).
 *  - zero      — "every krona is assigned", no surplus/free segment.
 *  - eligible/ — the conditional CloseBand carries an accent/danger treatment,
 *    overdue     a carry-forward preview, and a Review & close CTA.
 *  - closed /  — read-only months expose ZERO open-month edit affordances: no
 *    skipped     MoneyState, no pillar workbench, no attention lane, no close band.
 *
 * Screenshots (visual artifacts in the test output dir):
 *   - desktop: open-normal, deficit, close-band
 *   - mobile:  open-normal, deficit
 *
 * Seeded users (Backend.Tools): closeSurplusFull (+1250, open close-window, with
 * a closed + skipped month behind it); dashboardDeficit (-750) and dashboardZero
 * (0) — dedicated, never-mutated open-month fixtures so the deficit/zero views
 * are deterministic (the shared close* users get closed by close-month specs).
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function waitForOpenDashboard(page: Page): Promise<void> {
  await expect(page.getByTestId("money-state")).toBeVisible();
  await expect(page.getByTestId("pillar-workbench")).toBeVisible();
}

/** The open-month V2 surfaces. None may appear on a read-only month. */
async function expectNoOpenMonthSurfaces(page: Page): Promise<void> {
  await expect(page.getByTestId("money-state")).toHaveCount(0);
  await expect(page.getByTestId("pillar-workbench")).toHaveCount(0);
  // V2 PR4 replaced the attention lane with the insight/action cards.
  await expect(page.getByTestId("insight-action-cards")).toHaveCount(0);
  // V2 PR3 surfaces — planning row and the DTO-gated preview detail are
  // open-month-only; neither may leak into closed/skipped months.
  await expect(page.getByTestId("planning-row")).toHaveCount(0);
  await expect(page.getByTestId("next-month-preview-detail")).toHaveCount(0);
  await expect(page.getByTestId("close-band")).toHaveCount(0);
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);
}

test("open-normal month renders the polished surface on desktop", async ({
  page,
}, testInfo) => {
  await login(page, e2eUsers.closeSurplusFull);
  await waitForOpenDashboard(page);

  // The polished open-month anatomy is present: hero anchor + allocation bar
  // (DP2/DP3) and the four-pillar workbench (DP1).
  await expect(page.getByTestId("money-state-remaining")).toBeVisible();
  await expect(page.getByTestId("money-state-allocation")).toBeVisible();
  await expect(page.getByTestId("pillar-income")).toBeVisible();
  await expect(page.getByTestId("pillar-expenses")).toBeVisible();
  await expect(page.getByTestId("pillar-savings")).toBeVisible();
  await expect(page.getByTestId("pillar-debts")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("dashboard-open-desktop.png"),
    fullPage: true,
  });
  // The app scrolls inside PageContainer (overflow-y-auto), so fullPage only
  // paints the first viewport — capture the lower workbench as an element
  // shot so the visual artifact actually shows it.
  await page.getByTestId("pillar-workbench").screenshot({
    path: testInfo.outputPath("dashboard-open-desktop-workbench.png"),
  });
});

// Uses the dedicated `dashboardDeficit` fixture, whose open month stays a
// deficit because no close-month spec mutates it. (The shared `closeDeficit`
// user can't be used here: close-month specs close its month, rolling the open
// month forward to a positive template.)
test("deficit month reads as short with a runs-out marker", async ({
  page,
}, testInfo) => {
  await login(page, e2eUsers.dashboardDeficit);
  await waitForOpenDashboard(page);

  const moneyState = page.getByTestId("money-state");
  await expect(moneyState).toHaveAttribute("data-tone", "negative");
  await expect(page.getByTestId("money-state-tone-word")).toBeVisible();
  // The anchor renders the magnitude behind a real minus sign (U+2212).
  await expect(page.getByTestId("money-state-remaining")).toContainText("−");

  // Deficit honesty (V2 flow bar): a thin danger marker shows where the
  // month's money runs out — the committed span past it is unfunded. The
  // V2 blueprint dropped the separate hatched unfunded segment.
  await expect(page.getByTestId("money-state-allocation-runs-out")).toBeAttached();

  await page.screenshot({
    path: testInfo.outputPath("dashboard-deficit-desktop.png"),
    fullPage: true,
  });
  await page.getByTestId("money-state").screenshot({
    path: testInfo.outputPath("dashboard-deficit-money-state.png"),
  });
});

// Uses the dedicated `dashboardZero` fixture (open month stays at exactly 0).
test("zero-remaining month reads as fully assigned with no free segment", async ({
  page,
}) => {
  await login(page, e2eUsers.dashboardZero);
  await waitForOpenDashboard(page);

  await expect(page.getByTestId("money-state")).toHaveAttribute(
    "data-tone",
    "zero",
  );
  await expect(page.getByTestId("money-state-tone-word")).toBeVisible();
  // Nothing is left over, so the bar carries no "free to allocate" segment and
  // the legend omits it.
  await expect(
    page.getByTestId("money-state-allocation-legend-free"),
  ).toHaveCount(0);
  await expect(
    page.getByTestId("money-state-allocation-free"),
  ).toHaveCount(0);
});

test("open close-window month surfaces the actionable close band with a carry-forward preview", async ({
  page,
}, testInfo) => {
  await login(page, e2eUsers.closeSurplusFull);
  await waitForOpenDashboard(page);

  const closeBand = page.getByTestId("close-band");
  await expect(closeBand).toBeVisible();
  // The seeded surplus month's close window is open. Its kind is *not*
  // deterministic across runs: it is `eligible` while inside the window and
  // ages to `overdue` once the window passes (both seed against the fixed
  // 2026-04 month relative to wall-clock "now"). This test therefore asserts
  // the shared "actionable" treatment — a prominent band + Review & close CTA
  // + carry-forward preview — common to both states. It does NOT claim to
  // cover the overdue-specific danger treatment; see the `test.fixme` below.
  await expect(closeBand).toHaveAttribute("data-kind", /eligible|overdue/);
  await expect(page.getByTestId("close-band-cta")).toBeVisible();
  await expect(page.getByTestId("close-band-carry-amount")).toBeVisible();
  // The MonthRail close CTA stays available for the same month.
  await expect(page.getByTestId("close-month-cta")).toBeVisible();

  await page.screenshot({
    path: testInfo.outputPath("dashboard-close-band-desktop.png"),
    fullPage: true,
  });
});

// Deterministic overdue-close coverage is an explicit DP5 gap. The danger
// treatment (`data-kind="overdue"`, danger tokens, "overdue" copy) only
// renders once the close window has aged past its deadline, and no seeded
// user pins that state deterministically — closeSurplusFull's window is
// time-relative (see the test above). Forcing it needs a dedicated seed
// profile with a back-dated/aged close window. Until that fixture exists this
// stays a visible pending test rather than a false-green tolerant matcher.
// The overdue *resolution* itself is already unit-covered in
// `CloseBand.test.tsx` and `closeBandState.test.ts`; this gap is e2e breadth
// only. Tracked in Design/DP5-VALIDATION-NOTES.md.
test.fixme(
  "overdue month surfaces the danger close band [needs an aged-close-window seed profile]",
  async ({ page }) => {
    // Intentionally unimplemented: requires e2eUsers.<overdueCloseWindow> with a
    // back-dated close window so data-kind="overdue" is deterministic.
    await login(page, e2eUsers.closeSurplusFull);
    await waitForOpenDashboard(page);
    await expect(page.getByTestId("close-band")).toHaveAttribute(
      "data-kind",
      "overdue",
    );
  },
);

test("closed month is read-only with no open-month surfaces", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);

  await login(page, e2eUsers.closeSurplusFull);
  await waitForOpenDashboard(page);

  await page.getByTestId("month-nav-previous").click();

  await expect(page.getByTestId("closed-month-recap")).toBeVisible();
  await expectNoOpenMonthSurfaces(page);
});

test("skipped month is read-only with no open-month surfaces", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(45_000);

  await login(page, e2eUsers.closeSurplusFull);
  await waitForOpenDashboard(page);

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("closed-month-recap")).toBeVisible();

  await page.getByTestId("month-nav-previous").click();

  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expectNoOpenMonthSurfaces(page);
});

test.describe("mobile single-column", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("open-normal dashboard renders the polished surface on mobile", async ({
    page,
  }, testInfo) => {
    await login(page, e2eUsers.closeSurplusFull);
    await waitForOpenDashboard(page);

    await expect(page.getByTestId("money-state-remaining")).toBeVisible();
    await expect(page.getByTestId("money-state-allocation")).toBeVisible();
    await expect(page.getByTestId("pillar-income")).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath("dashboard-open-mobile.png"),
      fullPage: true,
    });
  });

  test("deficit dashboard renders on mobile", async ({ page }, testInfo) => {
    await login(page, e2eUsers.dashboardDeficit);
    await waitForOpenDashboard(page);

    await expect(page.getByTestId("money-state")).toHaveAttribute(
      "data-tone",
      "negative",
    );

    await page.screenshot({
      path: testInfo.outputPath("dashboard-deficit-mobile.png"),
      fullPage: true,
    });
  });
});
