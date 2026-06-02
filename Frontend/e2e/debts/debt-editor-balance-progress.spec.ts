import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { normaliseMoneyText } from "../helpers/money";

// Debt editor balance-update & repayment-progress coverage for
// /dashboard/debts (Debt PR 10).
//
// Drives the dedicated `debtEditor` user's plan-linked "Student Loan", which
// has no recorded balance history at seed. The suite proves three contract
// points in order (tests share the persisted seed DB within this file):
//   1. No fake progress is shown when the backend has no balance events.
//   2. Updating the balance is a liability correction — it never moves the
//      planned monthly payment or the dashboard-reconciled payment total.
//   3. Progress renders only once a real `DebtBalanceEvent` exists.
//
// Selectors are testid-first. Student Loan is used because the add/edit spec
// leaves it untouched, so its balance history is empty when this file runs.

const STUDENT_LOAN = "Student Loan";

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

async function openRowMenu(
  page: Page,
  row: ReturnType<typeof rowByName>,
): Promise<void> {
  const trigger = actionsTriggerOnRow(row);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
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
function rowPaymentText(row: ReturnType<typeof rowByName>) {
  return row.getByTestId("debt-row-payment");
}

test.describe.serial("debt editor — balance & progress", () => {
  test("shows no progress and no progress action when there is no balance history", async ({
    page,
  }) => {
    await gotoDebts(page);

    const studentLoan = rowByName(page, STUDENT_LOAN);
    await expect(studentLoan).toHaveCount(1);

    // No recorded balance events → no inline progress bar.
    await expect(studentLoan.getByTestId("debt-row-progress")).toHaveCount(0);

    // The row kebab offers Update balance (plan-linked) but NOT View
    // progress — progress is gated strictly on real read-model data, never
    // synthesised from current-vs-original balance.
    await openRowMenu(page, studentLoan);
    await expect(
      page.getByTestId("budget-editor-row-actions-item-update-balance"),
    ).toBeVisible();
    await expect(
      page.getByTestId("budget-editor-row-actions-item-view-progress"),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  test("updating the balance leaves the planned payment and monthly total untouched", async ({
    page,
  }) => {
    await gotoDebts(page);

    const studentLoan = rowByName(page, STUDENT_LOAN);
    const paymentBefore = normaliseMoneyText(
      (await rowPaymentText(studentLoan).textContent()) ?? "",
    );
    const stripPayments = page.getByTestId("debts-strip-payments-value");
    const paymentsBefore = normaliseMoneyText(
      (await stripPayments.textContent()) ?? "",
    );

    await clickRowAction(page, studentLoan, "update-balance");
    await expect(page.getByTestId("debt-balance-form")).toBeVisible();

    // The modal frames this as a correction that does not touch the planned
    // payment.
    await expect(page.getByTestId("debt-balance-callout")).toBeVisible();

    // Write the new balance to both the month row and the linked plan so a
    // source-level DebtBalanceEvent is recorded (drives the progress assertion
    // in the next test). The amount is a clear decrease from the seeded
    // ~93 880 kr balance.
    await page
      .getByTestId("debt-balance-modal-scope-currentMonthAndBudgetPlan")
      .click();
    await page.locator("#debt-balance-amount").fill("80000");
    await page.locator('button[form="debt-balance-form"]').click();

    await expect(page.getByTestId("debt-balance-form")).toHaveCount(0);

    const after = rowByName(page, STUDENT_LOAN);
    // Balance snapshot moved to the new value.
    await expect(rowBalanceText(after)).toHaveText(/80[\s  ]?000/);
    // Planned payment is byte-for-byte unchanged — a balance correction is
    // never a payment edit.
    expect(
      normaliseMoneyText((await rowPaymentText(after).textContent()) ?? ""),
    ).toEqual(paymentBefore);
    // The dashboard-reconciled monthly-payment total does not move either.
    expect(
      normaliseMoneyText((await stripPayments.textContent()) ?? ""),
    ).toEqual(paymentsBefore);
  });

  test("renders repayment progress once a real balance event exists", async ({
    page,
  }) => {
    await gotoDebts(page);

    const studentLoan = rowByName(page, STUDENT_LOAN);

    // The balance event recorded in the previous test now backs a real
    // progress reading: the inline bar renders and the kebab offers View
    // progress. `DebtLedgerRow` renders the progress node in both the mobile
    // and desktop layouts (one hidden per viewport), so scope to `:visible`.
    await expect(
      studentLoan.locator('[data-testid="debt-row-progress"]:visible'),
    ).toBeVisible();

    await clickRowAction(page, studentLoan, "view-progress");
    const modal = page.getByTestId("debt-progress-modal");
    await expect(modal).toBeVisible();
    // The progress view shows a real percent derived from the recorded
    // first-balance vs current-balance — not fabricated.
    await expect(page.getByTestId("debt-progress-percent")).toBeVisible();
    expect(
      ((await page.getByTestId("debt-progress-percent").textContent()) ?? "")
        .trim(),
    ).not.toEqual("");
  });
});
