import { expect, test } from "@playwright/test";
import { login } from "../helpers/login";

test("seeded budget user lands on dashboard @smoke", async ({ page }) => {
  await login(page, {
    email: "budget-demo@l.se",
    password: "P@ssw0rd!",
  });

  await expect(page.getByTestId("active-month-label")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
});
