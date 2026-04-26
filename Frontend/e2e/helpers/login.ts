import { expect, type Page } from "@playwright/test";

type LoginInput = {
  email: string;
  password: string;
};

export async function login(page: Page, input: LoginInput): Promise<void> {
  await page.goto("/login");

  await page.getByRole("textbox", { name: /email/i }).fill(input.email);
  await page.getByRole("textbox", { name: /password/i }).fill(input.password);

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") &&
      response.request().method() === "POST",
    { timeout: 8000 },
  );

  await page.getByRole("button", { name: /^log in$/i }).click();

  const loginResponse = await loginResponsePromise;

  if (!loginResponse.ok()) {
    const formAlert = page
      .locator("main")
      .getByRole("alert")
      .filter({ hasText: /too many attempts|could not reach the server/i })
      .first();

    await expect(formAlert).toBeVisible();
    throw new Error(
      `Login failed with status ${loginResponse.status()}. The seeded account is likely rate-limited or the API rejected the request.`,
    );
  }

  await expect(page).toHaveURL(/dashboard/i);
}
