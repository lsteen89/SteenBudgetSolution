import { expect, test } from "@playwright/test";

test("app boots to login page", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: /welcome back/i }),
  ).toBeVisible();

  await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();

  await expect(page.getByRole("button", { name: /^log in$/i })).toBeVisible();
});
