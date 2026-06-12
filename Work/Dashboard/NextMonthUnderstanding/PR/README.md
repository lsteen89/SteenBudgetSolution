# Next-Month Preview PR Catalog

This catalog splits the next-month preview and dashboard MVP into ordered PRs.

The goal is not to implement all future planning behavior in one pass. The safe MVP is:

1. backend read-only preview;
2. frontend preview page;
3. dashboard MVP layout changes;
4. preview-aware Next navigation.

Real next-month editing is later work and requires a persisted `planned` month model.

## Non-Negotiable Guardrails

- Do not use `GET /api/budgets/dashboard?yearMonth={next}` as preview.
- Do not calculate financial preview numbers in the frontend.
- Do not materialize or insert `BudgetMonth` rows for read-only preview.
- Do not allow multiple open months.
- Do not blur current-month edits, next-month-only edits, and budget-plan-forward edits.
- Do not put future-plan editing into the current-month quick drawer.
- Do not redesign nav, menus, account controls, or unrelated dashboard areas.
- The standalone dashboard HTML/design handoff is reference-only. Implement only the approved pieces listed in these PRs. If the standalone includes extra features, ignore them or ask.

## Approved MVP Visual Scope

The dashboard MVP is intentionally more than a tiny CTA change.

Approved:

- keep the current dashboard hero as the main answer;
- add/keep a next-month preview card/surface;
- change the next-month CTA to `Review next month` / `Granska nästa månad`;
- add the conceptual three-card model:
  - This month;
  - Next month;
  - Budget plan;
- remove the current large explanatory/help panel;
- replace it with three standalone cards underneath the next-month preview card, matching the approved standalone HTML intent;
- keep the existing app nav/menu model unchanged.

Not approved:

- implementing unrelated standalone HTML concepts;
- changing menus/nav just because the standalone has different menus;
- adding unapproved analytics, workbench, AI advice, bank/spend tracking, or advanced planning surfaces.

## Ordered PRs

| PR | Title | Aim |
| --- | --- | --- |
| PR 1 | Backend read-only next-month preview | Add safe backend-owned preview numbers without materializing a month. |
| PR 2 | Frontend `/dashboard/next-month` preview page | Add the dedicated preview route and render backend preview data read-only. |
| PR 3 | Dashboard MVP layout and cards | Add the approved dashboard card model, next-month CTA, and standalone card replacement. |
| PR 4 | Preview-aware Next button | Enable Next from the active month to route to preview when no persisted next month exists. |
| PR 5 | Planned month backend model | Add persisted `planned` month lifecycle for real next-month-only editing. |
| PR 6 | Editor selected-month refactor | Let full editor pages operate on selected open/planned month safely. |
| PR 7 | Planned next-month edit UX | Expose explicit next-month-only and budget-plan-forward edit actions. |

## MVP Boundary

MVP is PR 1 through PR 4.

MVP allows:

- preview next month;
- understand carry-over as estimated;
- see the dashboard model for this month, next month, and budget plan;
- use the dashboard Next button to reach the preview route;
- see the approved standalone cards beneath the preview card.

MVP does not allow:

- editing unopened next month;
- creating planned months;
- multiple open months;
- future-plan edits from the current-month quick drawer;
- frontend-generated financial preview math.

