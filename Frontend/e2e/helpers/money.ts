import { expect, type Page } from "@playwright/test";

// Normalise a displayed money string so two surfaces that render the same
// number with locale or punctuation drift still compare equal. Both
// surfaces this guards (dashboard hero, savings breakdown) now share the
// same fraction-digit policy (`moneyDecimalsFor`), so the only legitimate
// drift is locale punctuation: Unicode minus (−, U+2212) vs ASCII minus,
// regular space vs NBSP vs narrow NBSP, currency suffix, and the
// thousand/decimal separator chars.
//
// Policy (PR-04 §4.4): strip currency suffix + non-digit / non-minus
// chars, fold Unicode minus to ASCII, compare exactly. No numeric
// tolerance — different values still fail loudly.
export function normaliseMoneyText(displayed: string): string {
  return displayed.replace(/−/g, "-").replace(/[^0-9\-]/g, "");
}

export async function readMoneyTextByTestId(
  page: Page,
  testId: string,
): Promise<string> {
  const locator = page.getByTestId(testId);
  await expect(locator).toBeVisible();
  const text = (await locator.textContent()) ?? "";
  return normaliseMoneyText(text);
}
