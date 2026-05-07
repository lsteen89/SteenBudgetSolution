import { expect, test } from "@playwright/test";
import { e2eUsers } from "../helpers/e2eUsers";
import { login } from "../helpers/login";

const text = {
  closedStatus: /^(Closed|Stängd|Suletud)$/i,
  march2026: /mars 2026|march 2026|märts 2026/i,
  subscriptionSection:
    /recurring costs|återkommande kostnader|korduvad kulud/i,
};

test("closed comparable recap shows seeded subscription states for recap-subscriptions user", async ({
  page,
}) => {
  // The recap-subscriptions seed shapes 2026-01 and 2026-03 so that the
  // closed comparable recap exercises every subscription state the surface
  // can render: still active, renamed, new, removed, paused, cancelled.
  await login(page, e2eUsers.recapSubscriptions);

  await page.getByTestId("month-nav-previous").click();
  const recap = page.getByTestId("closed-month-recap");
  await expect(recap).toBeVisible();
  await expect(page.getByTestId("active-month-label")).toContainText(
    text.march2026,
  );
  await expect(page.getByTestId("month-status-badge")).toContainText(
    text.closedStatus,
  );

  const subscriptions = recap.getByTestId("closed-month-subscriptions");
  await expect(
    recap.getByRole("article", { name: text.subscriptionSection }),
  ).toBeVisible();

  const activeGroup = recap.getByTestId("closed-month-subscriptions-active");
  const newGroup = recap.getByTestId("closed-month-subscriptions-new");
  const removedGroup = recap.getByTestId("closed-month-subscriptions-removed");
  const pausedGroup = recap.getByTestId("closed-month-subscriptions-paused");
  const cancelledGroup = recap.getByTestId(
    "closed-month-subscriptions-cancelled",
  );

  await expect(activeGroup).toBeVisible();
  await expect(newGroup).toBeVisible();
  await expect(removedGroup).toBeVisible();
  await expect(pausedGroup).toBeVisible();
  await expect(cancelledGroup).toBeVisible();

  await expect(activeGroup).toContainText("Streaming TV");
  // Renamed in 2026-03 with the same source identity, so the new label should
  // appear in active (not as a new subscription) and the previous label must
  // not leak through.
  await expect(activeGroup).toContainText("Music Premium");
  await expect(activeGroup).not.toContainText("Music Now");

  await expect(newGroup).toContainText("Audiobooks");
  await expect(removedGroup).toContainText("Cloud Drive");
  await expect(pausedGroup).toContainText("News Daily");
  await expect(cancelledGroup).toContainText("Workout Plus");

  // Cancelled current subscriptions must not be double-counted as removed.
  await expect(removedGroup).not.toContainText("Workout Plus");
  // Paused / cancelled subscriptions must not appear in the active group.
  await expect(activeGroup).not.toContainText("News Daily");
  await expect(activeGroup).not.toContainText("Workout Plus");

  await expect(subscriptions.getByTestId("closed-month-subscriptions-meta"))
    .toBeVisible();
});
