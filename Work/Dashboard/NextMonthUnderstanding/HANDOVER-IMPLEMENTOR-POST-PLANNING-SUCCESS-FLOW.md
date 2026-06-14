# Implementor Prompt: Task 4 - Post-Planning Success Flow

You are implementing Task 4 for the next-month planning work: polish and harden
the post-planning success flow on `/dashboard/next-month`.

## Read First

Read:

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/frontend-ui.instructions.md`
- `Work/Dashboard/NextMonthUnderstanding/next-month-page-implementation-and-wiring.md`
- `Work/Dashboard/NextMonthUnderstanding/start-planning-next-month-future-wiring-spec.md`
- `docs/ai/ai-changelog.md`

Relevant current implementation:

- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx`
- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.test.tsx`
- `Frontend/src/hooks/budget/usePlanNextMonthMutation.ts`
- `Frontend/src/api/Services/Budget/budgetService.ts`
- `Frontend/src/hooks/budget/editPeriod/useEditorSelectedMonth.ts`

## Current Baseline

Tasks 1-3 are done. Do not rebuild them.

Already expected to exist:

- preview state reads `GET /api/budgets/months/{fromYearMonth}/next-preview`;
- `Start planning next month` calls `POST /api/budgets/months/{fromYearMonth}/next-planned`;
- pending state disables duplicate submit;
- failed create stays in preview and shows retryable feedback;
- successful create invalidates data and page transitions to `planned`;
- planned state reads `GET /api/budgets/dashboard?yearMonth={plannedYearMonth}`;
- planned edit links route to full editors with `?yearMonth={plannedYearMonth}`;
- planned editor pages show selected-month context.

## Goal

Make the transition from preview to planned feel complete, accessible, and hard
to regress.

This is frontend-focused. Do not add backend endpoints unless current contracts
are provably insufficient.

## Scope

Implement or verify:

- success state appears only after the create mutation succeeds;
- success copy uses the planned month name, for example `June is planned`;
- focus moves to the planned success/edit area after successful planning;
- route remains `/dashboard/next-month`;
- page does not reload;
- mutation cannot be double-submitted while pending;
- failed mutation leaves preview data visible and allows retry;
- edit hub is immediately reachable after success;
- success state does not show when revisiting an already-planned month;
- all copy keeps scopes honest: planned-month edits are separate from
  budget-plan-forward edits.

## Explicit Non-Goals

Do not implement:

- global budget-plan editor;
- budget-plan summary endpoint;
- rich delta reason backend;
- planned-month re-sync after budget-plan edits;
- separate `/dashboard/next-month/start` route;
- quick drawer editing for planned/future months;
- fake local lifecycle state that ignores React Query/server state.

## Implementation Notes

Prefer the smallest safe change.

If success ribbon already exists, do not redesign it. Add missing behavior
around it instead:

- use a stable focus target with `tabIndex={-1}`;
- focus after the page has transitioned to planned state;
- avoid focus stealing when loading an already-planned month directly;
- keep reduced-motion users in mind if adding scroll/focus polish.

If tests already cover part of this, extend them rather than replacing them.

## Tests Required

Update focused tests around `NextMonthPreviewPage`.

Required assertions:

- clicking start planning calls mutation with the open from-month;
- pending disables the CTA;
- failed mutation renders an alert and retry keeps same from-month;
- successful mutation renders the planned success state;
- success state focuses or exposes a deterministic focus target;
- planned state reads materialized dashboard data, not preview data;
- success state is absent for an already-planned month loaded from status;
- planned edit links include the planned `yearMonth`;
- route remains `/dashboard/next-month` after success.

If a stable seed exists, add one narrow Playwright smoke:

1. open `/dashboard/next-month`;
2. assert preview state;
3. click `Start planning next month`;
4. assert planned success/edit hub;
5. click one pillar editor;
6. assert URL includes planned `yearMonth`;
7. assert selected-month banner is visible.

If no stable idempotent seed exists, do not add a flaky E2E. State that clearly.

## Validation

Run at minimum:

```bash
cd Frontend
npx vitest run src/Pages/private/dashboard/NextMonthPreviewPage.test.tsx \
  src/domain/budget/nextMonthPreview.test.ts \
  src/hooks/budget/editPeriod/useEditorSelectedMonth.test.tsx
```

If editor navigation or selected-month behavior changes, also run the four
editor selected-month suites:

```bash
npx vitest run \
  src/Pages/private/income/IncomeEditorPage.selectedMonth.test.tsx \
  src/Pages/private/expenses/ExpensesEditorPage.selectedMonth.test.tsx \
  src/Pages/private/savings/SavingsEditorPage.selectedMonth.test.tsx \
  src/Pages/private/debts/DebtsEditorPage.selectedMonth.test.tsx
```

## Definition Of Done

- Post-create transition is keyboard-accessible and visually clear.
- Planned success/edit area is focused or otherwise immediately announced.
- Preview failure/retry behavior remains intact.
- No fake routes, fake money, fake global planner, or backend lifecycle changes.
- Focused tests pass and validation output is reported.
