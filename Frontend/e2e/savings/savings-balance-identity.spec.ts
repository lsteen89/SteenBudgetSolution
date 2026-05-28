import { expect, test, type Page } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

// Six-term identity guard for FE report §6 Q3.
//
// The savings editor's balance strip is the canonical surface for the honest
// "remaining" the savings module exposes:
//
//   kvar = income + carry − expenses − base − goals − debts
//
// The breakdown dl renders each term with a `savings-plan-balance-term-{key}`
// testid. Crucially the displayed values are SIGNED already — income and
// carry-over are rendered as positive, expenses / base / goals / debts as
// negative, remaining matches `honestRemaining` from the strip. That means we
// can simply sum the first six terms and assert the sum equals the remaining
// term within a 1-öre tolerance (0.01 SEK).

const TOLERANCE = 0.01;

// Strip currency symbols, spaces, NBSPs and narrow NBSPs; keep digits, the
// decimal separator (locale-dependent comma or period) and any minus sign.
// Then collapse thousand separators and normalise to a `.` decimal so
// Number.parseFloat can read it.
function parseAmount(displayed: string): number {
  // Unicode minus sign → ASCII minus so Number.parseFloat handles it.
  const normalised = displayed.replace(/−/g, "-");
  // Keep only digits, separators (. , ) and the sign.
  const cleaned = normalised.replace(/[^0-9.,\-]/g, "");
  if (cleaned.length === 0) return 0;
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  const decimalIndex = Math.max(lastDot, lastComma);
  if (decimalIndex < 0) return Number.parseFloat(cleaned);
  const whole = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
  const frac = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, "");
  const parsed = Number.parseFloat(`${whole}.${frac}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readTerm(page: Page, key: string): Promise<number> {
  const locator = page.getByTestId(`savings-plan-balance-term-${key}`);
  await expect(locator).toBeVisible();
  const text = (await locator.textContent()) ?? "";
  return parseAmount(text);
}

test("balance strip honors the six-term Kvar identity", async ({ page }) => {
  await login(page, e2eUsers.savingsEditor);
  await page.goto("/dashboard/savings");

  // Make sure the breakdown has rendered before we start reading terms.
  await expect(page.getByTestId("savings-plan-balance-strip")).toBeVisible();
  await expect(
    page.getByTestId("savings-plan-balance-breakdown"),
  ).toBeVisible();

  const income = await readTerm(page, "income");
  const carryOver = await readTerm(page, "carryOver");
  const expenses = await readTerm(page, "expenses");
  const baseSavings = await readTerm(page, "baseSavings");
  const goalSavings = await readTerm(page, "goalSavings");
  const debtPayments = await readTerm(page, "debtPayments");
  const remaining = await readTerm(page, "remaining");

  // Income / carry must be non-negative (sanity for the seed shape).
  expect(income).toBeGreaterThanOrEqual(0);
  expect(carryOver).toBeGreaterThanOrEqual(0);

  // Expenses / base / goals / debts render as NEGATIVE in the breakdown
  // (the strip stores them as `-value`), so we add them as displayed.
  const summed =
    income + carryOver + expenses + baseSavings + goalSavings + debtPayments;

  expect(Math.abs(summed - remaining)).toBeLessThanOrEqual(TOLERANCE);
});
