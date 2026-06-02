import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { normaliseMoneyText } from "../helpers/money";

// Debt editor lifecycle & participation coverage for /dashboard/debts
// (Debt PR 10).
//
// Exercises skip / include / archive / restore / mark-paid-off against a
// dedicated plan-linked debt the suite creates for itself ("E2E Lifecycle
// Debt"), so the destructive transitions never touch the seeded base debts
// other specs read. Tests share the persisted seed DB within this file and run
// in declared order: create → skip → include → archive+restore → mark paid.
//
// The two financial-honesty copy assertions are deliberate: skipping must say
// the balance still stands, and marking paid off must not claim a real payment
// was recorded. They match either the Swedish (default app locale) or English
// phrasing so the check is robust to whatever locale the E2E browser resolves;
// both dictionaries carry the same financial-honesty contract.

const LIFECYCLE_DEBT = "E2E Lifecycle Debt";

async function gotoDebts(page: Page): Promise<void> {
  await login(page, e2eUsers.debtEditor);
  await page.goto("/dashboard/debts");
  await expect(page.getByTestId("debts-soul-hero")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("debts-balance-strip")).toBeVisible();
}

function rowByName(page: Page, name: string) {
  return page.getByTestId("debt-ledger-row").filter({ hasText: name });
}

function actionsTriggerOnRow(row: ReturnType<typeof rowByName>) {
  return row.locator(
    '[data-testid="budget-editor-row-actions-trigger"]:visible',
  );
}

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
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}

function rowBalanceText(row: ReturnType<typeof rowByName>) {
  return row.getByTestId("debt-row-balance");
}

// Drive a lifecycle action from the row kebab through to the confirmation
// dialog's primary button. Asserts the dialog opened with the expected
// `data-action` and closed on confirm.
async function confirmLifecycle(
  page: Page,
  row: ReturnType<typeof rowByName>,
  actionKey: string,
  expectedDataAction: string,
): Promise<void> {
  await clickRowAction(page, row, actionKey);
  const dialog = page.getByTestId("debt-lifecycle-confirm");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("data-action", expectedDataAction);
  await page.getByTestId("debt-lifecycle-confirm-action").click();
  await expect(dialog).toHaveCount(0);
}

test.describe.serial("debt editor — lifecycle & participation", () => {
  test("creates a plan-linked debt to exercise lifecycle actions", async ({
    page,
  }) => {
    await gotoDebts(page);

    await page.getByTestId("debts-hero-add").click();
    await expect(page.getByTestId("debt-create-form")).toBeVisible();

    // Default scope is current-month + budget plan → plan-linked source debt
    // with skip / paid / archive permissions.
    await page.locator("#debt-create-name").fill(LIFECYCLE_DEBT);
    await page.locator("#debt-create-balance").fill("9000");
    await page.locator("#debt-create-apr").fill("5");
    await page.locator("#debt-create-min").fill("250");
    await page.locator("#debt-create-term").fill("18");
    await page.locator("#debt-create-payment").fill("700");

    await page.locator('button[form="debt-create-form"]').click();
    await expect(page.getByTestId("debt-create-form")).toHaveCount(0);

    const created = rowByName(page, LIFECYCLE_DEBT);
    await expect(created).toHaveCount(1);
    await expect(created).toHaveAttribute("data-group", "active");
    await expect(created).toHaveAttribute("data-source-lifecycle", "active");
  });

  test("skips the debt this month without changing its balance", async ({
    page,
  }) => {
    await gotoDebts(page);

    const debt = rowByName(page, LIFECYCLE_DEBT);
    const balanceBefore = normaliseMoneyText(
      (await rowBalanceText(debt).textContent()) ?? "",
    );
    const stripPayments = page.getByTestId("debts-strip-payments-value");
    const paymentsBefore = normaliseMoneyText(
      (await stripPayments.textContent()) ?? "",
    );

    await clickRowAction(page, debt, "skip");
    const dialog = page.getByTestId("debt-lifecycle-confirm");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-action", "skip");
    // Financial-honesty contract: skipping must say the balance still stands.
    // Matches the default Swedish copy or its English mirror.
    await expect(dialog).toContainText(
      /du är fortfarande skyldig beloppet|you still owe the amount/i,
    );
    await page.getByTestId("debt-lifecycle-confirm-action").click();
    await expect(dialog).toHaveCount(0);

    const skipped = rowByName(page, LIFECYCLE_DEBT);
    await expect(skipped).toHaveAttribute("data-group", "skipped");
    // The dashboard-reconciled payment total drops by the skipped amount.
    await expect
      .poll(async () =>
        normaliseMoneyText((await stripPayments.textContent()) ?? ""),
      )
      .not.toEqual(paymentsBefore);
    // The balance is untouched — skipping is participation, not a payment.
    expect(
      normaliseMoneyText((await rowBalanceText(skipped).textContent()) ?? ""),
    ).toEqual(balanceBefore);
  });

  test("includes the debt again and restores the monthly total", async ({
    page,
  }) => {
    await gotoDebts(page);

    const debt = rowByName(page, LIFECYCLE_DEBT);
    await expect(debt).toHaveAttribute("data-group", "skipped");

    const stripPayments = page.getByTestId("debts-strip-payments-value");
    const skippedTotal = normaliseMoneyText(
      (await stripPayments.textContent()) ?? "",
    );

    await confirmLifecycle(page, debt, "include", "include");

    await expect(rowByName(page, LIFECYCLE_DEBT)).toHaveAttribute(
      "data-group",
      "active",
    );
    await expect
      .poll(async () =>
        normaliseMoneyText((await stripPayments.textContent()) ?? ""),
      )
      .not.toEqual(skippedTotal);
  });

  test("archives the debt and restores it back to active", async ({
    page,
  }) => {
    await gotoDebts(page);

    const debt = rowByName(page, LIFECYCLE_DEBT);
    await confirmLifecycle(page, debt, "archive", "archive");

    // The archived group is collapsed by default; expand it to reveal the row.
    await expect(rowByName(page, LIFECYCLE_DEBT)).toHaveCount(0);
    await page.getByTestId("debt-ledger-group-archived-head").click();

    const archived = rowByName(page, LIFECYCLE_DEBT);
    await expect(archived).toHaveAttribute("data-group", "archived");

    // Restore, re-including the current month. The robust lifecycle proof is
    // that the source is no longer archived (`data-source-lifecycle` back to
    // `active`); whether the current month lands as included or not-included
    // is a separate product decision we do not over-assert here.
    await clickRowAction(page, archived, "restore");
    const dialog = page.getByTestId("debt-lifecycle-confirm");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-action", "restore");
    await page.getByTestId("debt-lifecycle-reinclude").click();
    await page.getByTestId("debt-lifecycle-confirm-action").click();
    await expect(dialog).toHaveCount(0);

    const restored = rowByName(page, LIFECYCLE_DEBT);
    await expect(restored).toHaveAttribute("data-source-lifecycle", "active");
    await expect(restored).not.toHaveAttribute("data-group", "archived");
  });

  test("marks the debt as paid off without claiming a real payment", async ({
    page,
  }) => {
    await gotoDebts(page);

    const debt = rowByName(page, LIFECYCLE_DEBT);

    await clickRowAction(page, debt, "mark-paid");
    const dialog = page.getByTestId("debt-lifecycle-confirm");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-action", "markPaidOff");
    // Financial-honesty contract: marking paid off is a status change, not a
    // recorded bank payment. Matches the default Swedish copy or its English
    // mirror.
    await expect(dialog).toContainText(
      /ingen faktisk betalning registreras|no actual payment is recorded/i,
    );
    await page.getByTestId("debt-lifecycle-confirm-action").click();
    await expect(dialog).toHaveCount(0);

    await expect(rowByName(page, LIFECYCLE_DEBT)).toHaveAttribute(
      "data-group",
      "paid",
    );
  });
});
