import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  signedDelta: /[+\-−]/,
};

test("closed comparable recap shows seeded savings + debt detail for recap-savings-debt user", async ({
  page,
}) => {
  // The recap-savings-debt seed shapes 2026-01 and 2026-03 so the closed
  // comparable recap exercises every savings/debt state the surface can
  // render: deltas by source identity, current-only month entries, and
  // deterministic ordering by monthly contribution / monthly payment.
  await login(page, e2eUsers.recapSavingsDebt);

  await page.getByTestId("month-nav-previous").click();
  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.march2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  // Savings detail
  const savingsBlock = recap.getByTestId("closed-month-savings-detail");
  await expect(savingsBlock).toBeVisible();
  await expect(
    savingsBlock.getByTestId("closed-month-savings-insight"),
  ).toBeVisible();

  const savingsRows = savingsBlock.locator(
    'li[data-testid^="closed-month-savings-goal-"]',
  );
  await expect(savingsRows).toHaveCount(3);

  // MonthlyContribution DESC ordering: Emergency Fund (2000), House Deposit (1500),
  // Travel Fund (600).
  await expect(savingsRows.nth(0)).toContainText("Emergency Fund");
  await expect(savingsRows.nth(1)).toContainText("House Deposit");
  await expect(savingsRows.nth(2)).toContainText("Travel Fund");

  const emergencyRow = savingsRows.filter({ hasText: "Emergency Fund" });
  const houseRow = savingsRows.filter({ hasText: "House Deposit" });
  const travelRow = savingsRows.filter({ hasText: "Travel Fund" });

  // Emergency Fund and House Deposit have a previous-month source identity,
  // so they render a signed delta cue. Emergency Fund increased so the cue
  // should start with "+"; House Deposit decreased so the cue should start
  // with "-" or the locale minus sign.
  await expect(emergencyRow).toContainText(/\+/);
  await expect(houseRow).toContainText(/[\-−]/);

  // Travel Fund is current-only (NULL SourceSavingsGoalId). It must not
  // render any signed delta cue.
  await expect(travelRow).not.toContainText(text.signedDelta);

  // Debt detail
  const debtBlock = recap.getByTestId("closed-month-debt-detail");
  await expect(debtBlock).toBeVisible();

  const debtRows = debtBlock.locator(
    'li[data-testid^="closed-month-debt-"]',
  );
  await expect(debtRows).toHaveCount(3);

  // MonthlyPayment DESC ordering: Student Loan (installment, dominates),
  // Credit Card (revolving), Phone Financing (current-only installment).
  await expect(debtRows.nth(0)).toContainText("Student Loan");
  await expect(debtRows.nth(1)).toContainText("Credit Card");
  await expect(debtRows.nth(2)).toContainText("Phone Financing");

  const studentLoanRow = debtRows.filter({ hasText: "Student Loan" });
  const creditCardRow = debtRows.filter({ hasText: "Credit Card" });
  const phoneFinancingRow = debtRows.filter({ hasText: "Phone Financing" });

  // Student Loan and Credit Card have a previous-month source identity, so
  // each renders a signed delta cue.
  await expect(studentLoanRow).toContainText(text.signedDelta);
  await expect(creditCardRow).toContainText(text.signedDelta);

  // Phone Financing is current-only (NULL SourceDebtId) — no delta cue.
  await expect(phoneFinancingRow).not.toContainText(text.signedDelta);

  // Debt type metadata renders the Pascal-cased word — proves the DTO
  // surfaced both revolving and installment types deterministically.
  await expect(debtBlock).toContainText(/Installment/);
  await expect(debtBlock).toContainText(/Revolving/);
});
