import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const traversalUser = e2eUsers.closeSurplusFull;

test("seeded budget user lands on an open dashboard @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await expect(page.getByTestId("active-month-label")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toBeVisible();
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
  await expect(page.getByTestId("skipped-month-state")).toHaveCount(0);
});

test("seeded closed month renders recap shell @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await page.getByTestId("month-nav-previous").click();

  await expect(page.getByTestId("closed-month-recap")).toBeVisible();
  await expect(
    page.getByTestId("closed-month-total-finalBalanceMonthly"),
  ).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);
});

test("seeded skipped month renders skipped shell @smoke", async ({ page }) => {
  await login(page, traversalUser);

  await page.getByTestId("month-nav-previous").click();
  await expect(page.getByTestId("closed-month-recap")).toBeVisible();

  await page.getByTestId("month-nav-previous").click();

  await expect(page.getByTestId("skipped-month-state")).toBeVisible();
  await expect(page.getByText(/skipped by user action/i)).toBeVisible();
  await expect(page.getByTestId("close-month-cta")).toHaveCount(0);
  await expect(page.getByTestId("closed-month-recap")).toHaveCount(0);
});
