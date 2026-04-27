import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

test("seeded budget user lands on dashboard @smoke", async ({ page }) => {
  await login(page, e2eUsers.closeBalanced);

  await expect(page.getByTestId("active-month-label")).toBeVisible();
  await expect(page.getByTestId("month-status-badge")).toBeVisible();
});
