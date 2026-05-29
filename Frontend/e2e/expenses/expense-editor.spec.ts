import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { normaliseMoneyText } from "../helpers/money";

// Expense editor coverage for /dashboard/expenses.
//
// Uses the dedicated `expensesEditor` E2E user (Default timeline profile).
// In the open month (2026-04) the editor renders, in addition to closed-
// month-only state:
//   - Rent, Groceries, Electricity, Home Internet, Mobile Plan, Netflix
//     → plan-linked active rows
//   - Transport Pass → plan-linked inactive (Open.ExpenseActivityChanges)
//   - Cloud Storage  → month-only subscription (Open.CreatedExpenses)
//   - Spotify        → soft-deleted in Open, never visible
//
// The Playwright config runs the spec sequentially under a single worker
// (`fullyParallel: false`) and the seed DB is recreated by global-setup.
// Test order matters because mutations persist between tests in this file:
// the create test populates a row the delete test removes; the lifecycle
// test pauses and then reactivates Netflix so subsequent tests do not see
// it paused. Selectors are testid-first so the suite is locale-agnostic.

const rows = {
  groceries: "Groceries",
  mobilePlan: "Mobile Plan",
  netflix: "Netflix",
  cloudStorage: "Cloud Storage",
} as const;

const CREATED_ROW_NAME = "E2E Custom Expense";

async function gotoExpenses(page: Page): Promise<void> {
  await login(page, e2eUsers.expensesEditor);
  await page.goto("/dashboard/expenses");
  // The hero + balance strip only render once the editor + categories +
  // dashboard month queries have all resolved (gated by the loading panel
  // in ExpensesEditorPage). The first request through Vite dev can be slow
  // (route + lazy chunks compiled on demand), so allow a generous timeout
  // on the structural settle, then assert the strip immediately.
  await expect(page.getByTestId("expenses-soul-hero")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("expenses-plan-balance-strip")).toBeVisible();
}

function rowByName(page: Page, name: string) {
  return page.getByTestId("expense-ledger-row").filter({ hasText: name });
}

// `ExpenseLedgerRow` renders the action trigger twice — once inside the
// `.sm:hidden` mobile layout and once inside `.hidden sm:grid` desktop
// layout — and only one is visible at the current viewport. Plain
// `getByTestId` finds both in the DOM and trips strict mode, so scope
// trigger lookups through the `:visible` CSS pseudo to pick the layout
// that is actually rendered.
function actionsTriggerOnRow(row: ReturnType<typeof rowByName>) {
  return row.locator(
    '[data-testid="budget-editor-row-actions-trigger"]:visible',
  );
}

// Open the row's actions dropdown and click the named item. Radix toggles
// `aria-expanded` on the trigger when the menu mounts; waiting on that
// before clicking the menu item avoids a race where back-to-back trigger
// clicks (e.g. pause → wait → reopen → resume) land on a portal that has
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

test.describe.serial("expenses editor", () => {
  test("loads the open month with hero, balance strip, and ledger groups", async ({
    page,
  }) => {
    await gotoExpenses(page);

    await expect(page.getByTestId("expenses-hero-headline")).toBeVisible();
    await expect(page.getByTestId("expenses-plan-balance-headline")).toBeVisible();

    // All three ledger groups are present for the Default timeline.
    await expect(page.getByTestId("expenses-ledger-group-fixed")).toBeVisible();
    await expect(
      page.getByTestId("expenses-ledger-group-variable"),
    ).toBeVisible();
    await expect(
      page.getByTestId("expenses-ledger-group-subscription"),
    ).toBeVisible();

    // Sanity-check that the seeded rows we drive the rest of the spec from
    // are actually visible. A missing row here means the timeline profile
    // has drifted and later tests would fail with a more confusing locator
    // error.
    await expect(rowByName(page, rows.groceries)).toHaveCount(1);
    await expect(rowByName(page, rows.mobilePlan)).toHaveCount(1);
    await expect(rowByName(page, rows.netflix)).toHaveCount(1);
    await expect(rowByName(page, rows.cloudStorage)).toHaveCount(1);
  });

  test("creates a month-only expense via the hero create button", async ({
    page,
  }) => {
    await gotoExpenses(page);

    await page.getByTestId("expenses-hero-create").click();

    // Create mode is explicitly month-only — the callout is visible and the
    // scope toggle is hidden (PR 3 contract).
    await expect(
      page.getByTestId("expense-item-modal-month-only-callout"),
    ).toBeVisible();
    await expect(
      page.getByTestId("expense-item-modal-scope-toggle"),
    ).toHaveCount(0);

    // Keep the default category (categories[0]) — the spec asserts row
    // identity by name, not by category, so we do not need to drive the
    // <select>.
    await page.locator("#expense-name").fill(CREATED_ROW_NAME);
    await page.locator("#expense-amount").fill("444");

    await page.locator('button[form="expense-item-form"]').click();

    // Modal dismisses on success.
    await expect(
      page.getByTestId("expense-item-modal-month-only-callout"),
    ).toHaveCount(0);

    const created = rowByName(page, CREATED_ROW_NAME);
    await expect(created).toHaveCount(1);
    await expect(created).toHaveAttribute("data-row-source-kind", "monthOnly");
  });

  test("edits a plan-linked row for the current month only", async ({
    page,
  }) => {
    await gotoExpenses(page);

    const expensesTerm = page.getByTestId(
      "expenses-plan-balance-term-expenses",
    );
    const beforeExpenses = normaliseMoneyText(
      (await expensesTerm.textContent()) ?? "",
    );

    const groceries = rowByName(page, rows.groceries);
    await expect(groceries).toHaveAttribute(
      "data-row-source-kind",
      "planLinked",
    );

    await clickRowAction(page, groceries, "edit");

    await page
      .getByTestId("expense-item-modal-scope-toggle-currentMonthOnly")
      .click();
    await page.locator("#expense-amount").fill("3500");
    await page.locator('button[form="expense-item-form"]').click();

    await expect(
      page.getByTestId("expense-item-modal-scope-toggle"),
    ).toHaveCount(0);

    // Row redraws with the new amount and the balance strip's expenses term
    // moves. Exact arithmetic is intentionally not asserted — the spec only
    // proves the strip reacted to the write.
    await expect(rowByName(page, rows.groceries)).toContainText(/3[\s  ]?500/);
    await expect
      .poll(async () =>
        normaliseMoneyText((await expensesTerm.textContent()) ?? ""),
      )
      .not.toEqual(beforeExpenses);
  });

  test("edits a plan-linked row for the budget plan only without touching the current month row", async ({
    page,
  }) => {
    await gotoExpenses(page);

    const mobilePlan = rowByName(page, rows.mobilePlan);
    // Pre-condition: the seeded current-month amount is 299 kr and the row
    // is plan-linked.
    await expect(mobilePlan).toHaveAttribute(
      "data-row-source-kind",
      "planLinked",
    );
    await expect(mobilePlan).toContainText(/299/);

    await clickRowAction(page, mobilePlan, "edit");

    await page
      .getByTestId("expense-item-modal-scope-toggle-budgetPlanOnly")
      .click();
    await page.locator("#expense-amount").fill("350");

    // The plan preview must report the current-month column as unchanged
    // and the budget-plan column as receiving the edit. The data attributes
    // give us a locale-free assertion of the scope semantics.
    const preview = page.getByTestId("expense-item-modal-plan-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-current-receives-edit", "false");
    await expect(preview).toHaveAttribute("data-plan-receives-edit", "true");

    await page.locator('button[form="expense-item-form"]').click();
    await expect(preview).toHaveCount(0);

    // Post-condition: the visible current-month row still shows 299 kr and
    // does not start showing the edited 350 (the row delta meta uses the
    // delta amount, 51, not the absolute plan amount, so 350 must not
    // appear anywhere in the row).
    const after = rowByName(page, rows.mobilePlan);
    await expect(after).toContainText(/299/);
    await expect(after).not.toContainText(/350/);
  });

  test("a month-only row hides plan-writing scopes from the edit modal", async ({
    page,
  }) => {
    await gotoExpenses(page);

    const cloud = rowByName(page, rows.cloudStorage);
    await expect(cloud).toHaveAttribute("data-row-source-kind", "monthOnly");

    await clickRowAction(page, cloud, "edit");

    // Only the current-month-only scope is selectable. EditScopeRadioCards
    // renders the plan scopes as <button disabled>, so `toBeDisabled`
    // resolves against the real DOM attribute.
    await expect(
      page.getByTestId("expense-item-modal-scope-toggle-currentMonthOnly"),
    ).toBeEnabled();
    await expect(
      page.getByTestId(
        "expense-item-modal-scope-toggle-currentMonthAndBudgetPlan",
      ),
    ).toBeDisabled();
    await expect(
      page.getByTestId("expense-item-modal-scope-toggle-budgetPlanOnly"),
    ).toBeDisabled();

    // Close without writing. Reset (during modal open) cleared isDirty, so
    // Escape closes immediately without a discard prompt.
    await page.keyboard.press("Escape");
    await expect(
      page.getByTestId("expense-item-modal-scope-toggle"),
    ).toHaveCount(0);
  });

  // Pause / reactivate are kept as two separate tests because they each
  // need their own fresh page load. Driving two action-menu cycles on the
  // same row in a single test ran into a Radix DropdownMenu re-open race
  // (the second open's pointer-event binding was still settling when the
  // resume item was clicked, leaving the menu open and the handler unfired).
  // Splitting also makes the totals before/after assertions easier to read.
  test("pausing a subscription removes it from the subscription group total", async ({
    page,
  }) => {
    await gotoExpenses(page);

    const subscriptionTotal = page.getByTestId(
      "expenses-ledger-group-subscription-total",
    );
    const beforeTotal = normaliseMoneyText(
      (await subscriptionTotal.textContent()) ?? "",
    );

    const netflix = rowByName(page, rows.netflix);
    await expect(netflix).toHaveAttribute("data-row-state", "active");

    await clickRowAction(page, netflix, "subscriptionPause");

    await expect(rowByName(page, rows.netflix)).toHaveAttribute(
      "data-row-state",
      "subscriptionPaused",
    );
    await expect
      .poll(async () =>
        normaliseMoneyText((await subscriptionTotal.textContent()) ?? ""),
      )
      .not.toEqual(beforeTotal);
  });

  test("reactivating a paused subscription restores it to the group total", async ({
    page,
  }) => {
    // Pre-condition: the previous test paused Netflix and the seeded DB
    // persists across tests in this serial file, so Netflix is paused on
    // page load. We capture the paused total, then drive the resume
    // through the row's action menu and prove both the row state and the
    // group total recover.
    await gotoExpenses(page);

    const subscriptionTotal = page.getByTestId(
      "expenses-ledger-group-subscription-total",
    );
    const pausedTotal = normaliseMoneyText(
      (await subscriptionTotal.textContent()) ?? "",
    );

    const netflix = rowByName(page, rows.netflix);
    await expect(netflix).toHaveAttribute(
      "data-row-state",
      "subscriptionPaused",
    );

    await clickRowAction(page, netflix, "subscriptionResume");

    await expect(rowByName(page, rows.netflix)).toHaveAttribute(
      "data-row-state",
      "active",
    );
    await expect
      .poll(async () =>
        normaliseMoneyText((await subscriptionTotal.textContent()) ?? ""),
      )
      .not.toEqual(pausedTotal);
  });

  test("deletes a month-only row from the visible ledger via the confirm dialog", async ({
    page,
  }) => {
    await gotoExpenses(page);

    const target = rowByName(page, CREATED_ROW_NAME);
    await expect(target).toHaveCount(1);

    await clickRowAction(page, target, "delete");

    const dialog = page.getByTestId("delete-expense-item-dialog");
    await expect(dialog).toBeVisible();
    await page.getByTestId("delete-expense-item-confirm").click();

    await expect(dialog).toHaveCount(0);
    await expect(rowByName(page, CREATED_ROW_NAME)).toHaveCount(0);
  });
});
