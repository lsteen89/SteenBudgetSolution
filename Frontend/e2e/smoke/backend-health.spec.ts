import { expect, test } from "@playwright/test";

test("backend is reachable @smoke", async ({ request }) => {
  const response = await request.get(
    "http://localhost:5001/api-docs/index.html",
  );
  expect(response.ok()).toBeTruthy();
});
