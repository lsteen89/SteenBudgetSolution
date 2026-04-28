import { expect, test } from "@playwright/test";

test("backend is reachable @smoke", async ({ request }) => {
  const backendUrl = process.env.VITE_APP_API_URL ?? "http://localhost:5001";
  const response = await request.get(`${backendUrl}/api-docs/index.html`);
  expect(response.ok()).toBeTruthy();
});
