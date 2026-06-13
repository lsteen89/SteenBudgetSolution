# Implementor Prompt: Next-Month Page

You are implementing the real `/dashboard/next-month` page from the approved
standalone design.

## Read First

Read these project rules:

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/backend.instructions.md`
- `.agents/instructions/frontend-ui.instructions.md`

Read these next-month docs:

- `Work/Dashboard/NextMonthUnderstanding/next-month-page-implementation-and-wiring.md`
- `Work/Dashboard/NextMonthUnderstanding/start-planning-designer-handoff.md`
- `Work/Dashboard/NextMonthUnderstanding/start-planning-next-month-future-wiring-spec.md`

Use this design reference:

```text
/Users/linussteen/Downloads/Next Month (standalone)(1).html
```

Reference SHA-256:

```text
32b0520e8e3d2d5c9bdf46e6f4ba4639d9fefb3815e043fd7ae2dad07e175aa8
```

## Goal

Port the standalone visual direction into the real React page and wire it to
existing backend contracts.

This should be one PR.

## Product Rules

- `/dashboard/next-month` owns both states: `preview` and `planned`.
- No separate start-planning route.
- No planning wizard.
- No fake global budget-plan editor.
- No quick drawer for planned/future month edits.
- Page must still look like eBudget.
- Backend changes are allowed only if existing contracts are insufficient or
  wrong. Prefer existing contracts first.

## Existing Contracts

Use these:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
POST /api/budgets/months/{fromYearMonth}/next-planned
GET /api/budgets/dashboard?yearMonth={plannedYearMonth}
```

Use these editor destinations:

```text
/dashboard/income?yearMonth={plannedYearMonth}
/dashboard/expenses?yearMonth={plannedYearMonth}
/dashboard/savings?yearMonth={plannedYearMonth}
/dashboard/debts?yearMonth={plannedYearMonth}
```

## Implementation Scope

Implement:

- approved standalone layout on `NextMonthPreviewPage`;
- preview state using backend preview data;
- optional confirmation modal before creating planned month;
- pending state for create action;
- mutation error state;
- success ribbon after planned month is created;
- planned state using materialized planned dashboard data;
- edit hub that routes to real pillar editors with `?yearMonth=`;
- copy that explains default edits apply only to the planned month;
- copy that budget-plan-forward scope is chosen inside the editor;
- loading, error, unavailable, and empty-plan states.

Do not implement:

- new foundation-budget/global budget-plan page;
- arbitrary future-month planning;
- multiple planned months;
- frontend-computed money totals;
- backend-owned delta reason text unless already available;
- broad dashboard navigation redesign.

## Suggested Code Path

Inspect before changing:

- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx`
- `Frontend/src/hooks/budget/useNextMonthPreviewQuery.ts`
- `Frontend/src/hooks/budget/usePlanNextMonthMutation.ts`
- `Frontend/src/api/Services/Budget/budgetService.ts`
- `Frontend/src/hooks/budget/editPeriod/useEditorSelectedMonth.ts`
- `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`

Then:

1. Extract page-local components enough to keep `NextMonthPreviewPage.tsx`
   readable.
2. Port layout section by section from the standalone.
3. Keep data flow query-driven.
4. Wire start planning through `usePlanNextMonthMutation`.
5. Keep planned edit actions as real navigation links.
6. Update or add focused tests.

## Validation

Run the narrow relevant frontend tests. Start with:

```bash
cd Frontend
npx vitest run src/Pages/private/dashboard/NextMonthPreviewPage.test.tsx \
  src/domain/budget/nextMonthPreview.test.ts \
  src/hooks/budget/editPeriod/useEditorSelectedMonth.test.tsx
```

If editor route/link behavior changes, add the directly affected editor tests.

If this PR adds Playwright coverage, keep it one smoke path:

1. open month exists, no planned month;
2. visit `/dashboard/next-month`;
3. assert preview;
4. create planned month;
5. assert planned;
6. open one pillar editor;
7. assert URL has planned `yearMonth` and editor shows selected-month banner.

## Done Means

- Page visually matches the approved standalone direction.
- Preview and planned states are distinct.
- Start planning creates planned month through existing endpoint.
- Planned state uses materialized dashboard data, not preview projection.
- Edit hub routes to real editors with selected planned month.
- Scope copy is honest and hard to miss.
- No fake money, fake route, or fake global planner.
- Focused validation run is reported.
