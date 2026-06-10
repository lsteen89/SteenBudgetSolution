# PR 3: Dashboard MVP Layout And Cards

## Goal

Update the dashboard MVP layout so users can distinguish this month, next month, and budget plan, and replace the current explanatory UI with three standalone cards under the next-month preview card.

## Scope In

- Keep the current/open month hero as the dominant dashboard area.
- Add the conceptual three-card row:
  - This month;
  - Next month;
  - Budget plan.
- Make `Review next month` / `Granska nästa månad` the primary next-month CTA.
- Route that CTA to `/dashboard/next-month`.
- Add or position the next-month preview card/surface using backend preview availability where applicable.
- Remove the large explanatory/help panel currently represented by `Värt en snabb koll` / `Uppmärksamhet`.
- Replace that explanatory panel with three standalone cards underneath the next-month preview card, matching the approved standalone HTML intent.
- Keep copy short and action-oriented.
- Preserve the existing nav/menu/account model.

## Scope Out

- No menu/nav redesign.
- No implementation of unrelated standalone HTML features.
- No workbench/analytics/bank/spend-tracking additions.
- No fake budget-plan totals.
- No next-month editing.
- No current-month quick drawer future editing.

## Backend Files / Areas Likely Touched

None required.

Optional only if existing frontend data cannot determine preview availability:

- month status DTO/query shape may need a narrow backend addition in a separate backend PR, not hidden inside this one.

## Frontend Files / Areas Likely Touched

- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- dashboard card components under existing dashboard folders.
- `Frontend/src/utils/i18n/pages/private/dashboard/*`
- relevant dashboard tests.

## Data Contracts / DTOs

Use existing dashboard/month-status DTOs.

Do not invent frontend financial DTOs.

Use `NextMonthPreviewDto` from PR 1/2 only where the dashboard deliberately fetches or receives preview data. If the dashboard does not fetch preview data in this PR, the next-month card must avoid showing preview money numbers.

## Tests Required

- Current hero remains present.
- Conceptual cards render:
  - This month;
  - Next month;
  - Budget plan.
- `Review next month` CTA routes to `/dashboard/next-month`.
- Old explanatory/help container is gone.
- Three standalone cards render underneath the next-month preview card.
- Standalone card copy/actions match approved scope.
- Nav/menu labels are unchanged.
- No dashboard test expects frontend-calculated preview totals.

## Risks

- Scope creep from the standalone HTML.
- Accidentally changing nav/menu structure.
- Showing budget-plan or preview totals without backend support.
- Confusing the conceptual three-card row with the separate standalone cards below the preview.

## Dependencies

- PR 2 for a live route target.
- PR 1 if the dashboard itself displays preview numbers. Without PR 1 data, it may show CTA/state only.

## Definition Of Done

- Dashboard clearly separates this month, next month, and budget plan.
- The main next-month action is `Review next month`.
- The old explanatory/help area is replaced by three standalone cards below the preview card.
- Only approved standalone HTML dashboard pieces are implemented.
- Existing nav/menu/account controls remain unchanged.

