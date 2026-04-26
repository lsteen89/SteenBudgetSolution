// e2e/smoke/login.spec.ts
import { test } from "@playwright/test";
import { login } from "../helpers/login";

test("seeded e2e user can log in @smoke", async ({ page }) => {
  await login(page, {
    email: "budget-demo@l.se",
    password: "P@ssw0rd!",
  });
});
