# PR 4: Preview-Aware Next Button

## Goal

Enable the dashboard Next button from the active/open month so it routes to next-month preview when no persisted next month exists.

## Scope In

- Distinguish persisted month navigation from preview navigation.
- If a persisted next month exists, keep normal persisted-month navigation.
- If no persisted next month exists and preview is available, route to `/dashboard/next-month`.
- If preview is unavailable, keep Next disabled with clear state.
- Keep previous button behavior for previous persisted months.
- Avoid injecting fake next-month entries into month status data.

## Scope Out

- No arbitrary future month navigation.
- No `/dashboard/months/{yyyy-MM}/preview` route.
- No frontend preview calculations.
- No planned month creation.
- No change to backend lifecycle invariant.

## Backend Files / Areas Likely Touched

None expected.

If frontend cannot determine preview availability safely, add a narrow backend contract in a separate backend PR or extend PR 1/2 explicitly.

## Frontend Files / Areas Likely Touched

- `Frontend/src/components/organisms/dashboard/shell/MonthRail.tsx`
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- dashboard navigation/view-model helper files if present.
- `Frontend/src/routes/appRoutes.ts`
- `Frontend/src/utils/i18n/pages/private/dashboard/*`
- `MonthRail` and dashboard tests.

## Data Contracts / DTOs

No new DTO required if preview availability can be derived from:

- active/open month;
- persisted month list;
- preview endpoint availability.

Do not mutate month status DTO client-side to add a fake next month.

## Tests Required

- Active open month with no persisted next month routes Next to `/dashboard/next-month`.
- Active open month with persisted next month uses normal persisted navigation.
- Preview unavailable keeps Next disabled.
- Previous navigation still works.
- No request is made to `/api/budgets/dashboard?yearMonth={next}`.

## Risks

- Making preview route look like persisted month navigation.
- Breaking existing month rail read-only month behavior.
- Enabling Next when no preview can be served.

## Dependencies

- PR 1.
- PR 2.

## Definition Of Done

- Next button has correct behavior across active/open, persisted-next, and unavailable states.
- No fake month is added to frontend state.
- Navigation is covered by focused tests.

