import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { normaliseMoneyText } from "../helpers/money";

// Income editor coverage for /dashboard/income (PR 7 of the income editor
// redesign).
//
// Uses the dedicated `incomeEditor` E2E user (Default timeline profile).
// In the open month (2026-04) the editor renders:
//   - Net salary 32 000 kr → plan-linked, locked name, always-active
//   - "Freelance" 2 500 kr → plan-linked sideHustle
//   - "Partner contribution" 1 500 kr → plan-linked householdMember
// Plus the salary group is single-row by backend invariant (no add).
//
// The Playwright config runs the spec sequentially under a single worker
// (`fullyParallel: false`) and the seed DB is recreated by global-setup.
// Test order matters because mutations persist between tests in this file:
// the global-add test creates a side-income row the delete test removes;
// the deactivate/activate pair toggles the Partner contribution row off
// and back on so the suite finishes in a clean state. Selectors are
// testid-first so the suite is locale-agnostic.

const rows = {
  salary: "Net salary", // displayed label is localized; we resolve via row kind
  freelance: "Freelance",
  partnerContribution: "Partner contribution",
} as const;

// Names used by the spec's create tests. The global-add test creates the
// side income that the delete test later removes; the group-add test
// creates a household income that simply hangs around until the seed DB
// is rebuilt on the next E2E run.
const GLOBAL_ADD_SIDE_NAME = "E2E Custom Side Income";
const GROUP_ADD_HOUSEHOLD_NAME = "E2E Custom Household";

async function gotoIncome(page: Page): Promise<void> {
  await login(page, e2eUsers.incomeEditor);
  await page.goto("/dashboard/income");

  // The hero + distribution strip only render once income items + dashboard
  // month queries have resolved (the page gates them behind a loading panel
  // to avoid flashing fake zero totals). The first dev request can be slow
  // through Vite, so allow a generous timeout on the hero, then assert the
  // strip and ledger groups immediately.
  await expect(page.getByTestId("income-hero-headline")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("income-distribution-strip")).toBeVisible();
}

function rowByName(page: Page, name: string) {
  return page.getByTestId("income-ledger-row").filter({ hasText: name });
}

// `IncomeLedgerRow` renders the action trigger twice (mobile + desktop
// layouts via responsive utility classes); only one is visible at a time.
// Scope trigger lookups through `:visible` to avoid strict-mode failures.
function actionsTriggerOnRow(row: ReturnType<typeof rowByName>) {
  return row.locator(
    '[data-testid="budget-editor-row-actions-trigger"]:visible',
  );
}

// Open the row's actions dropdown and click the named item. Radix toggles
// `aria-expanded` on the trigger when the menu mounts; waiting on that
// before clicking the menu item avoids a race where back-to-back trigger
// clicks (e.g. deactivate → reopen → activate) land on a portal that has
// not finished re-mounting yet, leaving the menu open and the handler
// unfired. Tests that need to drive two menus on the same row in quick
// succession should always go through this helper.
async function clickRowAction(
  page: Page,
  row: ReturnType<typeof rowByName>,
  actionKey: string,
): Promise<void> {
  const trigger = actionsTriggerOnRow(row);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page
    .getByTestId(`budget-editor-row-actions-item-${actionKey}`)
    .click();
  // Menu closes on select. Anchoring the next assertion on the trigger
  // collapsing prevents the next mutation/refetch wait from racing the
  // dropdown portal teardown.
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}

function rowByKind(
  page: Page,
  kind: "salary" | "sideHustle" | "householdMember",
) {
  return page
    .getByTestId("income-ledger-row")
    .and(page.locator(`[data-row-kind="${kind}"]`));
}

async function readMoneyInt(
  page: Page,
  testId: string,
): Promise<number> {
  const locator = page.getByTestId(testId);
  await expect(locator).toBeVisible();
  const raw = (await locator.textContent()) ?? "";
  const normalised = normaliseMoneyText(raw);
  const parsed = parseInt(normalised, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Could not parse money text for ${testId}: "${raw}"`);
  }
  return parsed;
}

test.describe.serial("income editor", () => {
  test("loads the open month with hero, distribution strip, and three ledger groups", async ({
    page,
  }) => {
    await gotoIncome(page);

    await expect(page.getByTestId("income-hero-headline")).toBeVisible();
    await expect(page.getByTestId("income-hero-split")).toBeVisible();
    await expect(page.getByTestId("income-hero-create")).toBeVisible();
    await expect(page.getByTestId("income-distribution-headline")).toBeVisible();

    // The three locked-order ledger groups are all present.
    await expect(page.getByTestId("income-ledger-group-salary")).toBeVisible();
    await expect(
      page.getByTestId("income-ledger-group-householdMember"),
    ).toBeVisible();
    await expect(
      page.getByTestId("income-ledger-group-sideHustle"),
    ).toBeVisible();

    // Salary group has no add affordance (single-row group by backend
    // invariant). The other two do.
    await expect(
      page.getByTestId("income-ledger-group-salary-add"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("income-ledger-group-householdMember-add"),
    ).toBeVisible();
    await expect(
      page.getByTestId("income-ledger-group-sideHustle-add"),
    ).toBeVisible();

    // The seeded rows the rest of the spec drives must be present. A miss
    // here would mean the Default timeline drifted and later tests would
    // fail with confusing locator errors.
    await expect(rowByKind(page, "salary")).toHaveCount(1);
    await expect(rowByName(page, rows.freelance)).toHaveCount(1);
    await expect(rowByName(page, rows.partnerContribution)).toHaveCount(1);
  });

  test("distribution strip equation reconciles displayed terms", async ({
    page,
  }) => {
    await gotoIncome(page);

    // Read all six terms as integers (whole-krona display, fractionDigits 0).
    // Negative terms (expenses / savings / debts) come back negative because
    // the strip renders them with a leading minus.
    const income = await readMoneyInt(page, "income-distribution-term-income");
    const carryOver = await readMoneyInt(
      page,
      "income-distribution-term-carryOver",
    );
    const expenses = await readMoneyInt(
      page,
      "income-distribution-term-expenses",
    );
    const savings = await readMoneyInt(
      page,
      "income-distribution-term-savings",
    );
    const debts = await readMoneyInt(page, "income-distribution-term-debts");
    const free = await readMoneyInt(page, "income-distribution-term-free");

    // Identity: income + carryOver + (-expenses) + (-savings) + (-debts) === free
    // (the expense/savings/debt terms are already negative in the breakdown).
    // No tolerance — values are whole-krona, so any drift is a real bug.
    expect(income + carryOver + expenses + savings + debts).toBe(free);
  });

  test("global hero add creates a month-only side income via the type selector", async ({
    page,
  }) => {
    await gotoIncome(page);

    await page.getByTestId("income-hero-create").click();

    // Global add is the kind-unknown path — the type selector must be
    // rendered, and the two-card create-scope selector must be present (the
    // old static "Skapas bara i {month}" callout was replaced by a real
    // scope choice in the income editor refactor).
    await expect(page.locator("#income-kind")).toBeVisible();
    await expect(
      page.getByTestId("income-item-modal-create-scope"),
    ).toBeVisible();

    // Pick sideHustle so the row lands in the side income group, and choose
    // the month-only scope (create defaults to recurring) so the delete test
    // below has a deterministic month-only row to remove.
    await page.locator("#income-kind").selectOption("sideHustle");
    await page
      .getByTestId("income-item-modal-create-scope-currentMonthOnly")
      .click();
    await page.locator("#income-name").fill(GLOBAL_ADD_SIDE_NAME);
    await page.locator("#income-amount").fill("750");

    await page.locator('button[form="income-item-form"]').click();

    // Modal dismisses on success.
    await expect(page.locator("#income-item-form")).toHaveCount(0);

    const created = rowByName(page, GLOBAL_ADD_SIDE_NAME);
    await expect(created).toHaveCount(1);
    await expect(created).toHaveAttribute("data-row-source-kind", "monthOnly");
    await expect(created).toHaveAttribute("data-row-kind", "sideHustle");

    // Month-only rows render the `Bara {månad}` pill — assert the data
    // attribute so the assertion is locale-agnostic.
    await expect(
      created.getByTestId("income-ledger-row-pill"),
    ).toHaveAttribute("data-row-pill", "monthOnly");
  });

  test("group add creates a household income with the type selector preselected and hidden", async ({
    page,
  }) => {
    await gotoIncome(page);

    await page.getByTestId("income-ledger-group-householdMember-add").click();

    // Group add preselects the kind and hides the selector — the user
    // chose "household" by clicking that group's add. The two-card
    // create-scope selector appears regardless of entry point.
    await expect(page.locator("#income-kind")).toHaveCount(0);
    await expect(
      page.getByTestId("income-item-modal-create-scope"),
    ).toBeVisible();

    // Choose the month-only scope (create defaults to recurring) so the
    // later edit/delete tests have a deterministic month-only household row.
    await page
      .getByTestId("income-item-modal-create-scope-currentMonthOnly")
      .click();
    await page.locator("#income-name").fill(GROUP_ADD_HOUSEHOLD_NAME);
    await page.locator("#income-amount").fill("1200");

    await page.locator('button[form="income-item-form"]').click();
    await expect(page.locator("#income-item-form")).toHaveCount(0);

    const created = rowByName(page, GROUP_ADD_HOUSEHOLD_NAME);
    await expect(created).toHaveCount(1);
    await expect(created).toHaveAttribute(
      "data-row-source-kind",
      "monthOnly",
    );
    await expect(created).toHaveAttribute(
      "data-row-kind",
      "householdMember",
    );
  });

  test("edits a plan-linked row for the current month only and the distribution income term moves", async ({
    page,
  }) => {
    await gotoIncome(page);

    const incomeTerm = page.getByTestId("income-distribution-term-income");
    const beforeIncome = normaliseMoneyText(
      (await incomeTerm.textContent()) ?? "",
    );

    const freelance = rowByName(page, rows.freelance);
    await expect(freelance).toHaveAttribute(
      "data-row-source-kind",
      "planLinked",
    );

    await clickRowAction(page, freelance, "edit");

    // Plan-linked rows render the scope toggle. Force currentMonthOnly so
    // the test asserts the scope semantics explicitly (the default state
    // is also currentMonthOnly, but clicking it documents intent).
    await page
      .getByTestId("income-item-modal-scope-toggle-currentMonthOnly")
      .click();
    await page.locator("#income-amount").fill("3000");
    await page.locator('button[form="income-item-form"]').click();

    await expect(page.locator("#income-item-form")).toHaveCount(0);

    // Row redraws with the new amount and the distribution strip's income
    // term moves. Exact arithmetic is intentionally not asserted — the
    // spec only proves the strip reacted to the write.
    await expect(rowByName(page, rows.freelance)).toContainText(
      /3[\s  ]?000/,
    );
    await expect
      .poll(async () =>
        normaliseMoneyText((await incomeTerm.textContent()) ?? ""),
      )
      .not.toEqual(beforeIncome);
  });

  test("edits a plan-linked row for the budget plan only without touching the current month row", async ({
    page,
  }) => {
    await gotoIncome(page);

    const partner = rowByName(page, rows.partnerContribution);
    // Pre-condition: seeded current-month amount is 1 500 kr and the row
    // is plan-linked.
    await expect(partner).toHaveAttribute(
      "data-row-source-kind",
      "planLinked",
    );
    await expect(partner).toContainText(/1[\s  ]?500/);

    await clickRowAction(page, partner, "edit");

    await page
      .getByTestId("income-item-modal-scope-toggle-budgetPlanOnly")
      .click();
    await page.locator("#income-amount").fill("2200");

    await page.locator('button[form="income-item-form"]').click();
    await expect(page.locator("#income-item-form")).toHaveCount(0);

    // Post-condition: the visible current-month row still shows 1 500 kr
    // and does NOT start showing the edited 2 200 (budgetPlanOnly writes
    // only to the plan row; the month row is untouched).
    const after = rowByName(page, rows.partnerContribution);
    await expect(after).toContainText(/1[\s  ]?500/);
    await expect(after).not.toContainText(/2[\s  ]?200/);
    // Still active and still plan-linked.
    await expect(after).toHaveAttribute("data-row-state", "active");
    await expect(after).toHaveAttribute(
      "data-row-source-kind",
      "planLinked",
    );
  });

  test("a month-only row hides plan-writing scopes from the edit modal", async ({
    page,
  }) => {
    await gotoIncome(page);

    // Use the household row created by the group-add test — it's month-only
    // by construction (create endpoint always writes null source id).
    const target = rowByName(page, GROUP_ADD_HOUSEHOLD_NAME);
    await expect(target).toHaveAttribute("data-row-source-kind", "monthOnly");

    await clickRowAction(page, target, "edit");

    // Only currentMonthOnly is selectable. `EditScopeRadioCards` renders
    // the plan scopes as `<button disabled>`, so `toBeDisabled` resolves
    // against the real DOM attribute.
    await expect(
      page.getByTestId("income-item-modal-scope-toggle-currentMonthOnly"),
    ).toBeEnabled();
    await expect(
      page.getByTestId(
        "income-item-modal-scope-toggle-currentMonthAndBudgetPlan",
      ),
    ).toBeDisabled();
    await expect(
      page.getByTestId("income-item-modal-scope-toggle-budgetPlanOnly"),
    ).toBeDisabled();

    // Close without writing.
    await page.keyboard.press("Escape");
    await expect(page.locator("#income-item-form")).toHaveCount(0);
  });

  // Deactivate / reactivate are kept as two separate tests for the same
  // reason as the expense subscription pair — driving two action-menu
  // cycles on the same row in a single test ran into a Radix DropdownMenu
  // re-open race. Splitting also makes the totals before/after assertions
  // easier to read.
  test("deactivating a household row removes it from the household group total", async ({
    page,
  }) => {
    await gotoIncome(page);

    const householdTotal = page.getByTestId(
      "income-ledger-group-householdMember-total",
    );
    const beforeTotal = normaliseMoneyText(
      (await householdTotal.textContent()) ?? "",
    );

    const partner = rowByName(page, rows.partnerContribution);
    await expect(partner).toHaveAttribute("data-row-state", "active");

    await clickRowAction(page, partner, "deactivate");

    await expect(rowByName(page, rows.partnerContribution)).toHaveAttribute(
      "data-row-state",
      "inactive",
    );
    await expect(
      rowByName(page, rows.partnerContribution).getByTestId(
        "income-ledger-row-pill",
      ),
    ).toHaveAttribute("data-row-pill", "inactiveInMonth");

    await expect
      .poll(async () =>
        normaliseMoneyText((await householdTotal.textContent()) ?? ""),
      )
      .not.toEqual(beforeTotal);
  });

  test("reactivating an inactive household row restores it to the group total", async ({
    page,
  }) => {
    // Pre-condition: the previous test deactivated Partner contribution
    // and the seeded DB persists across tests in this serial file, so the
    // row is inactive on page load. We capture the inactive total, then
    // drive the resume through the row's action menu and prove both the
    // row state and the group total recover.
    await gotoIncome(page);

    const householdTotal = page.getByTestId(
      "income-ledger-group-householdMember-total",
    );
    const inactiveTotal = normaliseMoneyText(
      (await householdTotal.textContent()) ?? "",
    );

    const partner = rowByName(page, rows.partnerContribution);
    await expect(partner).toHaveAttribute("data-row-state", "inactive");

    await clickRowAction(page, partner, "activate");

    await expect(rowByName(page, rows.partnerContribution)).toHaveAttribute(
      "data-row-state",
      "active",
    );
    // Reactivation removes the inactive pill, but the row remains changed
    // in April because the open-month seed overrides the plan amount.
    await expect(
      rowByName(page, rows.partnerContribution).getByTestId(
        "income-ledger-row-pill",
      ),
    ).toHaveAttribute("data-row-pill", "changedInMonth");

    await expect
      .poll(async () =>
        normaliseMoneyText((await householdTotal.textContent()) ?? ""),
      )
      .not.toEqual(inactiveTotal);
  });

  test("salary row exposes only the edit action — no toggle, no delete", async ({
    page,
  }) => {
    await gotoIncome(page);

    const salary = rowByKind(page, "salary");
    await expect(salary).toHaveCount(1);

    const trigger = actionsTriggerOnRow(salary);
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Salary kebab shows ONLY `Redigera`. The toggle and delete items must
    // not be rendered at all (the handover requires no fake affordances).
    await expect(
      page.getByTestId("budget-editor-row-actions-item-edit"),
    ).toBeVisible();
    await expect(
      page.getByTestId("budget-editor-row-actions-item-deactivate"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("budget-editor-row-actions-item-activate"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("budget-editor-row-actions-item-delete"),
    ).toHaveCount(0);

    // Close the menu without selecting anything.
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("salary edit drawer locks the name and active toggle and hides scope cards", async ({
    page,
  }) => {
    await gotoIncome(page);

    const salary = rowByKind(page, "salary");
    await clickRowAction(page, salary, "edit");

    // Locked name + hint, locked active toggle + hint, no scope cards.
    // Salary name is readonly, not disabled, so it stays focusable and
    // readable while still refusing edits.
    await expect(page.locator("#income-name")).toHaveAttribute("readonly", "");
    await expect(
      page.getByTestId("income-item-modal-salary-name-hint"),
    ).toBeVisible();
    await expect(
      page.getByTestId("income-item-modal-active-toggle"),
    ).toBeDisabled();
    await expect(
      page.getByTestId("income-item-modal-salary-active-hint"),
    ).toBeVisible();
    // No scope cards for salary — there is no plan-writing path the user
    // could meaningfully choose, so the section is omitted entirely.
    await expect(
      page.getByTestId("income-item-modal-scope-toggle"),
    ).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(page.locator("#income-item-form")).toHaveCount(0);
  });

  test("deletes the month-only side income from the visible ledger via the confirm dialog", async ({
    page,
  }) => {
    await gotoIncome(page);

    const target = rowByName(page, GLOBAL_ADD_SIDE_NAME);
    await expect(target).toHaveCount(1);

    await clickRowAction(page, target, "delete");

    const dialog = page.getByTestId("delete-income-item-dialog");
    await expect(dialog).toBeVisible();
    await page.getByTestId("delete-income-item-confirm").click();

    await expect(dialog).toHaveCount(0);
    await expect(rowByName(page, GLOBAL_ADD_SIDE_NAME)).toHaveCount(0);
  });
});
