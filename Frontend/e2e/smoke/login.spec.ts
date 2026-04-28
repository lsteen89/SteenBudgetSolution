// e2e/smoke/login.spec.ts
import { test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

test("seeded e2e user can log in @smoke", async ({ page }) => {
  await login(page, e2eUsers.login);
});
