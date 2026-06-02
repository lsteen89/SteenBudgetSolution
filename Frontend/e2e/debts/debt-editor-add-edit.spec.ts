import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";
import { normaliseMoneyText } from "../helpers/money";

// Debt editor add / edit coverage for /dashboard/debts (Debt PR 10).
//
// Uses the dedicated `debtEditor` E2E user (Default timeline profile). In the
// open month (2026-04) the editor renders two plan-linked active debts:
//   - "Credit Card"  → revolving, plan-linked
//   - "Student Loan" → installment, plan-linked
//
// The Playwright config runs the suite sequentially under a single worker
// (`fullyParallel: false`) and the seed DB is recreated by global-setup. The
// debt suite owns a dedicated account, so its destructive / future-
// materialization-sensitive mutations never bleed into the expenses, income,
// or savings suites. Within this file, tests run in declared order and the
// seed DB persists between them: `add month-only` and `add plan-linked` create
// rows that the later month-only-scope test reuses.
//
// Selectors are testid-first so the suite is locale-agnostic; money is matched
// with space-grouped numeric regexes (the E2E environment renders sv-SE-style
// grouping, matching the income/expense suites). The financial-honesty copy
// assertions live in the lifecycle spec, where the contract is most
// load-bearing.

const MONTH_ONLY_NAME = "E2E Month Only Debt";
const PLAN_LINKED_NAME = "E2E Plan Debt";

const rows = {
  creditCard: "Credit Card",
  studentLoan: "Student Loan",
} as const;

async function gotoDebts(page: Page): Promise<void> {
  await login(page, e2eUsers.debtEditor);
  await page.goto("/dashboard/debts");

  // The hero + balance strip only render once the debt editor read model and
  // the dashboard month query have resolved (the page gates them behind a
  // loading panel to avoid flashing fake zero totals). The first request
  // through Vite dev can be slow, so allow a generous timeout on the hero,
  // then assert the strip immediately.
  await expect(page.getByTestId("debts-soul-hero")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("debts-balance-strip")).toBeVisible();
}

function rowByName(page: Page, name: string) {
  return page.getByTestId("debt-ledger-row").filter({ hasText: name });
}

// `DebtLedgerRow` renders the action trigger twice — once in the `.sm:hidden`
// mobile layout and once in the `.hidden sm:grid` desktop layout — and only
// one is visible at the current viewport. Scope trigger lookups through the
// `:visible` pseudo so strict mode does not trip over the hidden duplicate.
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

// The desktop layout exposes the two money columns as dedicated testids
// (`debt-row-balance` / `debt-row-payment`); the mobile layout uses inline
// labelled spans with no testid, so exactly one element matches per row.
function rowBalanceText(row: ReturnType<typeof rowByName>) {
  return row.getByTestId("debt-row-balance");
}
function rowPaymentText(row: ReturnType<typeof rowByName>) {
  return row.getByTestId("debt-row-payment");
}

test.describe.serial("debt editor — add & edit", () => {
  test("@smoke loads the open month with hero, balance strip, and ledger groups", async ({
    page,
  }) => {
    await gotoDebts(page);

    await expect(page.getByTestId("debts-hero-headline")).toBeVisible();

    // The active group and its two seeded plan-linked debts are present. A
    // missing row here means the Default timeline drifted and later tests
    // would fail with a more confusing locator error.
    await expect(page.getByTestId("debt-ledger-group-active")).toBeVisible();
    await expect(rowByName(page, rows.creditCard)).toHaveCount(1);
    await expect(rowByName(page, rows.studentLoan)).toHaveCount(1);

    // Payment / balance reconciliation sanity: the strip leads with the
    // included monthly-payment total (the dashboard-reconciled debt outflow)
    // and shows the owed balance as a separate snapshot. Both must be
    // present and non-empty — payment and balance never share a cell.
    const payments = await page
      .getByTestId("debts-strip-payments-value")
      .textContent();
    const balance = await page
      .getByTestId("debts-strip-balance-value")
      .textContent();
    expect(normaliseMoneyText(payments ?? "")).not.toEqual("");
    expect(normaliseMoneyText(balance ?? "")).not.toEqual("");
  });

  test("adds a month-only debt via the hero create button", async ({
    page,
  }) => {
    await gotoDebts(page);

    await page.getByTestId("debts-hero-add").click();
    await expect(page.getByTestId("debt-create-form")).toBeVisible();

    // Narrow the scope to month-only — the month-only callout appears and the
    // created row will carry no source link.
    await page.getByTestId("debt-create-modal-scope-currentMonthOnly").click();
    await expect(
      page.getByTestId("debt-create-month-only-callout"),
    ).toBeVisible();

    await page.locator("#debt-create-name").fill(MONTH_ONLY_NAME);
    await page.locator("#debt-create-balance").fill("5000");
    await page.locator("#debt-create-apr").fill("4");
    await page.locator("#debt-create-min").fill("200");
    await page.locator("#debt-create-term").fill("24");
    await page.locator("#debt-create-payment").fill("400");

    await page.locator('button[form="debt-create-form"]').click();

    // Modal dismisses on success.
    await expect(page.getByTestId("debt-create-form")).toHaveCount(0);

    const created = rowByName(page, MONTH_ONLY_NAME);
    await expect(created).toHaveCount(1);
    // Month-only rows have no linked plan source.
    await expect(created).toHaveAttribute("data-source-lifecycle", "none");
    await expect(created).toHaveAttribute("data-group", "active");
  });

  test("adds a plan-linked debt with the default current-month + plan scope", async ({
    page,
  }) => {
    await gotoDebts(page);

    await page.getByTestId("debts-hero-add").click();
    await expect(page.getByTestId("debt-create-form")).toBeVisible();

    // Default scope is current-month + budget plan, so the created debt links
    // to a source `Debt` row (lifecycle `active`).
    await page.locator("#debt-create-name").fill(PLAN_LINKED_NAME);
    await page.locator("#debt-create-balance").fill("12000");
    await page.locator("#debt-create-apr").fill("6");
    await page.locator("#debt-create-min").fill("300");
    await page.locator("#debt-create-term").fill("36");
    await page.locator("#debt-create-payment").fill("600");

    await page.locator('button[form="debt-create-form"]').click();
    await expect(page.getByTestId("debt-create-form")).toHaveCount(0);

    const created = rowByName(page, PLAN_LINKED_NAME);
    await expect(created).toHaveCount(1);
    await expect(created).toHaveAttribute("data-source-lifecycle", "active");
    await expect(created).toHaveAttribute("data-group", "active");
  });

  test("editing details for the current month never changes the balance", async ({
    page,
  }) => {
    await gotoDebts(page);

    const creditCard = rowByName(page, rows.creditCard);
    const balanceBefore = normaliseMoneyText(
      (await rowBalanceText(creditCard).textContent()) ?? "",
    );

    await clickRowAction(page, creditCard, "edit-details");
    await expect(page.getByTestId("debt-details-form")).toBeVisible();

    // The details modal exposes balance as a read-only fact — it is not an
    // editable field here (PR 7 contract: balance only moves via Uppdatera
    // saldo). Edit a metadata field with the current-month-only scope.
    await page
      .getByTestId("debt-details-modal-scope-currentMonthOnly")
      .click();
    await page.locator("#debt-details-apr").fill("7");
    await page.locator('button[form="debt-details-form"]').click();

    // Modal closes on success.
    await expect(page.getByTestId("debt-details-form")).toHaveCount(0);

    // The balance cell is byte-for-byte unchanged: a details edit must never
    // touch the liability balance.
    const balanceAfter = normaliseMoneyText(
      (await rowBalanceText(rowByName(page, rows.creditCard)).textContent()) ??
        "",
    );
    expect(balanceAfter).toEqual(balanceBefore);
  });

  test("editing the planned payment moves the monthly total but not the balance", async ({
    page,
  }) => {
    await gotoDebts(page);

    const creditCard = rowByName(page, rows.creditCard);
    const balanceBefore = normaliseMoneyText(
      (await rowBalanceText(creditCard).textContent()) ?? "",
    );
    const stripPayments = page.getByTestId("debts-strip-payments-value");
    const paymentsBefore = normaliseMoneyText(
      (await stripPayments.textContent()) ?? "",
    );

    await clickRowAction(page, creditCard, "edit-payment");
    await expect(page.getByTestId("debt-planned-payment-modal")).toBeVisible();

    await page.getByTestId("debt-modal-scope-toggle-currentMonthOnly").click();
    await page.locator("#debt-amount").fill("1234");
    await page.locator('button[form="debt-planned-payment-form"]').click();

    await expect(page.getByTestId("debt-planned-payment-modal")).toHaveCount(0);

    const after = rowByName(page, rows.creditCard);
    // The planned payment cell reflects the new amount.
    await expect(rowPaymentText(after)).toHaveText(/1[\s  ]?234/);
    // The balance cell is unchanged — editing planned payment is not a
    // balance reduction.
    expect(
      normaliseMoneyText((await rowBalanceText(after).textContent()) ?? ""),
    ).toEqual(balanceBefore);
    // The dashboard-reconciled monthly-payment total reacts to the write.
    await expect
      .poll(async () =>
        normaliseMoneyText((await stripPayments.textContent()) ?? ""),
      )
      .not.toEqual(paymentsBefore);
  });

  test("a month-only row cannot select budget-plan scopes", async ({
    page,
  }) => {
    await gotoDebts(page);

    const monthOnly = rowByName(page, MONTH_ONLY_NAME);
    await expect(monthOnly).toHaveAttribute("data-source-lifecycle", "none");

    await clickRowAction(page, monthOnly, "edit-payment");
    await expect(page.getByTestId("debt-planned-payment-modal")).toBeVisible();

    // Only the current-month scope is selectable; the plan-writing scopes are
    // rendered disabled because the row has no source link.
    await expect(
      page.getByTestId("debt-modal-scope-toggle-currentMonthOnly"),
    ).toBeEnabled();
    await expect(
      page.getByTestId(
        "debt-modal-scope-toggle-currentMonthAndBudgetPlan",
      ),
    ).toBeDisabled();
    await expect(
      page.getByTestId("debt-modal-scope-toggle-budgetPlanOnly"),
    ).toBeDisabled();
    // The scope assertions above are the point of this test; Playwright
    // discards the page after the test, so the modal is left open rather than
    // closed through locale-specific button copy.
  });
});
