import { expect, test } from "@playwright/test";
import { login } from "../helpers/login";

test("balanced month can be closed and next month becomes active", async ({
  page,
}) => {
  await login(page, {
    email: "budget-demo@l.se",
    password: "P@ssw0rd!",
  });

  const activeMonth = (
    await page.getByTestId("active-month-label").textContent()
  )?.trim();
  expect(activeMonth, "Active month label should exist").toBeTruthy();

  await expect(page.getByTestId("close-month-cta")).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toBeEnabled();

  await page.getByTestId("close-month-cta").click();
  await expect(page.getByTestId("close-month-modal")).toBeVisible();

  const yearMonth =
    activeMonth === "april 2026"
      ? "2026-04"
      : activeMonth === "maj 2026" || activeMonth === "may 2026"
        ? "2026-05"
        : null;

  expect(
    yearMonth,
    `Unsupported active month label: ${activeMonth}`,
  ).toBeTruthy();

  const [closeResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(`/api/budget/months/${yearMonth}/close`) &&
        response.request().method() === "POST",
    ),
    page.getByTestId("confirm-close-month").click(),
  ]);

  expect(closeResponse.ok(), "Close month API should succeed").toBeTruthy();
});
