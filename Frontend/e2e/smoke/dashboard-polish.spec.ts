import { expect, test, type Page, type Request } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

/**
 * DP5 — dashboard visual-polish smoke coverage.
 *
 * Locks the two load-path guarantees of the polish pass (DP1–DP4):
 *
 *  1. The polished open-month surface renders: the MoneyState hero anchor +
 *     tone word (DP3), the labelled AllocationBar legend (DP2), and the four
 *     dense pillar cards with their per-item lists (DP1).
 *  2. The dashboard still renders from the single `GET /api/budgets/dashboard`
 *     read — no editor/detail endpoint is fetched on initial load — and the
 *     per-pillar quick-adjust drawer fetches its editor data lazily, only once
 *     opened. This is the data-honesty invariant the whole refactor is built on.
 *
 * Uses the seeded surplus/eligible user (final balance +1250 kr) whose baseline
 * budget includes income sources, expense categories, one savings goal, and two
 * debts — so every pillar has real data to render.
 */

const surplusUser = e2eUsers.closeSurplusFull;

/**
 * Editor / detail endpoints that must NEVER be requested on initial dashboard
 * load. They are allowed only after the user opens a quick-adjust drawer or a
 * full editor page. Mirrors the reviewer handover's over-fetch list.
 */
const EDITOR_ENDPOINT = new RegExp(
  String.raw`/api/budgets/(?:` +
    String.raw`months/[^/]+/(?:income-items|expense-items|savings-goals|savings-methods|debt-items|debt-editor|editor)` +
    String.raw`|expense-categories` +
    String.raw`)`,
);

function isEditorRead(request: Request): boolean {
  return request.method() === "GET" && EDITOR_ENDPOINT.test(request.url());
}

async function waitForPolishedDashboard(page: Page): Promise<void> {
  await expect(page.getByTestId("money-state")).toBeVisible();
  await expect(page.getByTestId("pillar-workbench")).toBeVisible();
}

test("open-month dashboard renders the polished surface @smoke", async ({
  page,
}) => {
  await login(page, surplusUser);
  await waitForPolishedDashboard(page);

  // DP3 — the remaining anchor is the dominant element, with its inline tone
  // word, and reads as a surplus.
  const moneyState = page.getByTestId("money-state");
  await expect(moneyState).toHaveAttribute("data-tone", "positive");
  await expect(page.getByTestId("money-state-remaining")).toBeVisible();
  await expect(page.getByTestId("money-state-tone-word")).toBeVisible();

  // DP2 — the allocation flow bar carries a labelled legend; expenses, savings
  // and debts all have a planned amount this month, so all three appear.
  const legend = page.getByTestId("money-state-allocation-legend");
  await expect(legend).toBeVisible();
  await expect(
    page.getByTestId("money-state-allocation-legend-expenses"),
  ).toBeVisible();
  await expect(
    page.getByTestId("money-state-allocation-legend-savings"),
  ).toBeVisible();
  await expect(
    page.getByTestId("money-state-allocation-legend-debts"),
  ).toBeVisible();
  await expect(page.getByTestId("money-state-allocation")).toBeVisible();

  // DP1 — the four dense pillars render, and savings/debts expose their
  // per-item breakdown lists (the baseline budget seeds one goal + two debts).
  await expect(page.getByTestId("pillar-income")).toBeVisible();
  await expect(page.getByTestId("pillar-expenses")).toBeVisible();
  await expect(page.getByTestId("pillar-savings")).toBeVisible();
  await expect(page.getByTestId("pillar-debts")).toBeVisible();
  await expect(page.getByTestId("pillar-savings-goals-list")).toBeVisible();
  await expect(page.getByTestId("pillar-debts-list")).toBeVisible();
});

test("dashboard renders from a single read and lazy-loads the quick-adjust drawer @smoke", async ({
  page,
}) => {
  const editorReadsOnLoad: string[] = [];
  page.on("request", (request) => {
    if (isEditorRead(request)) {
      editorReadsOnLoad.push(`${request.method()} ${request.url()}`);
    }
  });

  await login(page, surplusUser);
  await waitForPolishedDashboard(page);

  // Invariant: nothing in the editor/detail surface was fetched to paint the
  // dashboard. All pillar figures came from GET /api/budgets/dashboard.
  expect(
    editorReadsOnLoad,
    `Editor endpoints must not be fetched on dashboard load, but saw:\n${editorReadsOnLoad.join("\n")}`,
  ).toEqual([]);

  // Opening the Expenses quick-adjust drawer lazily fetches the month editor
  // read (`/months/{ym}/editor`) — and only then.
  const editorResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/budgets\/months\/[^/]+\/editor(?:\?|$)/.test(response.url()) &&
      response.request().method() === "GET",
  );

  await page
    .getByTestId("pillar-expenses")
    .getByRole("button", {
      name: /quick adjust expenses|snabbjustera utgifter|kiirkohanda kulusid/i,
    })
    .click();

  const editorResponse = await editorResponsePromise;
  expect(editorResponse.ok()).toBeTruthy();
});

test("quick-adjust drawer saves one current-month expense edit @smoke", async ({
  page,
}) => {
  await login(page, surplusUser);
  await waitForPolishedDashboard(page);

  await page
    .getByTestId("pillar-expenses")
    .getByRole("button", {
      name: /quick adjust expenses|snabbjustera utgifter|kiirkohanda kulusid/i,
    })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("tab", { name: /expenses|utgifter|kulud/i }))
    .toHaveAttribute("aria-selected", "true");

  const firstExpenseInput = page
    .locator('[data-testid^="period-expense-row-"]')
    .locator("input:not(:disabled)")
    .first();

  await expect(firstExpenseInput).toBeVisible();
  await firstExpenseInput.fill("1234");

  const patchResponsePromise = page.waitForResponse(
    (response) =>
      /\/api\/budgets\/months\/[^/]+\/expense-items(?:\?|$)/.test(
        response.url(),
      ) &&
      response.request().method() === "PATCH",
  );

  await page
    .getByRole("button", {
      name: /save changes|spara ändringar|salvesta muudatused/i,
    })
    .click();

  const patchResponse = await patchResponsePromise;
  expect(patchResponse.ok()).toBeTruthy();
  await expect(page.getByRole("dialog")).toBeHidden();
});
