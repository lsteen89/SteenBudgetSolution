# Next-Month Page Implementation And Wiring

## Goal

Port the designer standalone into the real `/dashboard/next-month` page without
rebuilding the lifecycle foundation that already exists.

Source design:

```text
/Users/linussteen/Downloads/Next Month (standalone)(1).html
```

Reference SHA-256:

```text
32b0520e8e3d2d5c9bdf46e6f4ba4639d9fefb3815e043fd7ae2dad07e175aa8
```

This is now a page implementation PR, not a backend-discovery PR. No analyzer
handoff is needed before implementation. `master` already contains the core
planned-month support from `Feature/next month preview (#281)`.

## Current Verdict

We can build the page now.

Recommended PR shape:

- one focused PR for `/dashboard/next-month` visual port, start-planning
  confirmation/success/error polish, and planned editor links;
- no new global planning route;
- no new backend endpoint unless implementation proves an existing contract is
  missing or wrong;
- follow-up PR for making future-month/foundation-budget editing easier inside
  the pillar editors.

Already supported:

- read-only next-month preview;
- `Start planning next month`;
- persisted `planned` month status;
- planned month dashboard read;
- selected-month editor routing via `?yearMonth=YYYY-MM`;
- planned-month edit links for income, expenses, savings, debts;
- row-level edit scopes for "this selected month only" vs budget-plan-forward.

Not fully supported:

- a global budget-plan editor page;
- a standalone "change every month" CTA that edits all future months directly
  from `/dashboard/next-month`;
- backend-owned reason text for why each next-month delta changed;
- quick-drawer editing for planned/future months, which must stay out of scope.

## Updated Prototype Decisions

The newer standalone already corrected the main product risk.

Keep:

- `Preview — nothing saved` state language;
- `Start planning next month` as the primary CTA;
- optional confirmation modal before calling the create endpoint;
- create pending, success, and failed states;
- success ribbon after preview becomes planned;
- planned edit hub with four real pillar destinations;
- clear explanation that editor changes apply only to the planned month unless
  the user chooses a budget-plan-forward scope inside the editor.

Translate prototype-only behavior:

- `NMConfirmModal` can become a real confirmation modal if the implementation
  keeps the designer's default `startAction: "modal"`.
- `PillarModal` should not remain a fake navigation modal. In production, the
  hub actions should navigate to real editor routes. A small tooltip/helper line
  is fine, but clicking primary edit actions must move the user.
- Local stage changes in the standalone become real query-driven state:
  successful `POST next-planned` invalidates data, then the page re-renders as
  `planned`.

## Existing Contracts To Use

### Read Preview

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Frontend:

- `fetchNextMonthPreview(fromYearMonth)`
- `useNextMonthPreviewQuery(fromYearMonth)`
- `NextMonthPreviewDto`

Guarantees:

- read-only;
- does not insert a `BudgetMonth`;
- does not materialize month tables;
- only projects from the open month;
- returns `state: "preview"` or `state: "unavailable"`;
- preview money comes from backend `dashboard`.

### Create Planned Month

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
```

Frontend:

- `planNextMonth(fromYearMonth)`
- `usePlanNextMonthMutation()`
- `PlanNextMonthResultDto`

Guarantees:

- from-month must be the open month;
- planned month is immediate next month;
- open month stays open;
- operation is idempotent for same from-month;
- planned month materializes from budget plan rows;
- planned rows can be edited before close;
- close current month promotes planned month to open and applies final
  carry-over.

### Planned Month Read

```http
GET /api/budgets/dashboard?yearMonth={plannedYearMonth}
```

Frontend:

- `useBudgetDashboardMonthQuery(plannedYearMonth)`

Rule:

- planned state reads materialized planned rows, not the preview projection.

### Planned Month Edit

Routes:

```text
/dashboard/income?yearMonth={plannedYearMonth}
/dashboard/expenses?yearMonth={plannedYearMonth}
/dashboard/savings?yearMonth={plannedYearMonth}
/dashboard/debts?yearMonth={plannedYearMonth}
```

Frontend:

- `useEditorSelectedMonth()`
- `SelectedMonthBanner`
- editor pages and mutation hooks target selected month.

Rules:

- no query param: default to open month;
- valid planned `?yearMonth=`: editable;
- closed/skipped selected month: read-only;
- malformed/unknown selection: invalid state, no silent fallback.

## Page State Model

Keep using:

```ts
type NextMonthPageState =
  | { kind: "unavailable"; fromYearMonth: null; targetYearMonth: null }
  | { kind: "preview"; fromYearMonth: string; targetYearMonth: string }
  | { kind: "planned"; fromYearMonth: string; targetYearMonth: string }
  | { kind: "open"; fromYearMonth: string; targetYearMonth: string };
```

Current behavior:

- `preview`: call `next-preview`, render read-only page and start-planning
  panel.
- `planned`: call dashboard read for planned month, render edit hub.
- `open`: defensive redirect to dashboard.
- `unavailable`: show honest unavailable state.

## Implementation Scope

### Build / Refactor Components

Current `NextMonthPreviewPage.tsx` is too monolithic. Split page sections before
porting the design:

- `NextMonthPageShell`
- `NextMonthHeader`
- `NextMonthMoneySurface`
- `StartPlanningPanel`
- `PlannedEditHub`
- `NextMonthComparisonPanel`
- `NextMonthLifecyclePanel`
- `PlanningSuccessRibbon`
- `NextMonthUnavailableState`
- `NextMonthEmptyPlanState`
- `NextMonthErrorState`
- `NextMonthSkeleton`

Location:

```text
Frontend/src/Pages/private/dashboard/nextMonth/
```

or keep page-local components under:

```text
Frontend/src/Pages/private/dashboard/components/nextMonth/
```

Pick one and keep imports boring. Do not spread page-only components across the
dashboard organism folder unless reused by the main dashboard.

Do not block on perfect file boundaries. If time is tight, extract only the
sections needed to port the design cleanly and keep test seams readable.

### Port Designer Layout

Use the standalone as visual reference, not source code.

Port:

- header with state pill and compact explanation;
- main money surface;
- preview action panel;
- optional start-planning confirmation modal;
- planned edit hub;
- comparison panel;
- lifecycle panel;
- success ribbon after planning;
- loading/error/unavailable/empty-plan states.

Do not port:

- standalone nav/menu changes;
- fake pillar routing modal as final behavior;
- fake local lifecycle state where real API state exists;
- detached budget-plan editor modal as if it were real;
- any bank/spending tracker language.

### Preview State

Data:

- `months/status` decides from-month and target month;
- `next-preview` provides all preview money.

Render:

- page header: next month, month label, preview pill;
- money surface from `preview.dashboard`;
- estimated carry-over line from `preview.carryOver`;
- comparison/lifecycle panels only from backend numbers;
- `Start planning next month` panel.

CTA:

- calls `planMutation.mutate(fromYearMonth)`;
- disable while pending;
- on success, existing query invalidation should cause months status to include
  the planned month and page state to become `planned`.

Add:

- success ribbon after mutation success if it does not fight query-driven state;
- clear error copy for mutation failure.

Confirmation modal copy:

```text
Create planned {month}?
This creates an editable planned month from your budget plan. {currentMonth}
stays open. Final carry-over is applied when {currentMonth} closes.
```

Primary action:

```text
Create planned month
```

### Planned State

Data:

- `months/status` finds planned target;
- dashboard read loads planned month by `?yearMonth=`;
- do not use `next-preview` in planned state.

Render:

- page header: planned month, planned pill;
- money surface from materialized planned month;
- edit hub with four pillar actions;
- scope note: default edit is selected month only;
- separate budget-plan-forward explanation.

Edit actions:

```text
Income   -> /dashboard/income?yearMonth={plannedYearMonth}
Expenses -> /dashboard/expenses?yearMonth={plannedYearMonth}
Savings  -> /dashboard/savings?yearMonth={plannedYearMonth}
Debts    -> /dashboard/debts?yearMonth={plannedYearMonth}
```

Do not add a global "update budget plan" button unless the future spec is
implemented.

## Editing Next Month After Planning

This is the next real user task after the page creates a planned month.

Current supported path:

1. User creates planned next month from `/dashboard/next-month`.
2. Page enters `planned` state.
3. User chooses `Income`, `Expenses`, `Savings`, or `Debts` in the edit hub.
4. App navigates to the existing editor with `?yearMonth={plannedYearMonth}`.
5. Editor shows selected-month banner.
6. Default edit affects only the selected planned month.
7. Row-level scopes can also update the budget plan forward where the editor
   already supports that behavior.

UX requirement for this PR:

- make the edit hub obvious;
- keep the selected month visible in destination editors;
- copy must say "only {month}" by default;
- copy must say budget-plan-forward changes are chosen inside the editor;
- do not imply closed months or the current open month are changed.

What is still harder than it should be:

- users need to understand two concepts: planned month rows and foundation
  budget-plan rows;
- row-level scope controls live in editor forms, not on `/dashboard/next-month`;
- there is no global foundation-budget editor.

This should become a follow-up editor-usability PR, not a blocker for the page
port.

Follow-up focus:

- audit all four pillar editors with planned `?yearMonth`;
- make selected-month and edit-scope language impossible to miss;
- confirm every mutation uses the selected planned month correctly;
- confirm budget-plan-forward scope updates future foundation rows correctly;
- decide whether a dedicated foundation-budget page is worth building later.

## Handoff Prompts

Use these with the implementation PR:

- `Work/Dashboard/NextMonthUnderstanding/HANDOVER-IMPLEMENTOR-NEXT-MONTH-PAGE.md`
- `Work/Dashboard/NextMonthUnderstanding/HANDOVER-REVIEWER-NEXT-MONTH-PAGE.md`

## Copy Rules

Use product words:

- Next month
- Preview
- Planned
- Start planning next month
- Edit next month only
- Budget plan forward
- Applies only to {month}
- Based on {month} closing with {amount} left

Avoid:

- materialized
- mutation
- source row
- entity
- default row
- baseline
- "spend" or transaction language
- guilt/shame copy

## Design Rules

Must look like eBudget:

- use existing `--eb-*` tokens;
- keep app shell/background;
- use `shadow-eb`, `bg-eb-surface`, `border-eb-stroke`, `text-eb-text`;
- calm, financial, dense enough to be useful;
- no marketing hero;
- no random palette;
- no decorative visual systems outside eBudget.

## Tests Required

### Unit / Component

Update/add tests around `NextMonthPreviewPage`:

- preview renders backend preview figures;
- preview renders estimated carry-over copy;
- preview shows start-planning CTA and no edit hub;
- click start planning calls mutation with open from-month;
- pending mutation disables CTA;
- mutation error renders actionable feedback;
- planned state reads dashboard for planned target month;
- planned state does not call preview query as active data;
- planned edit links include `?yearMonth={planned}`;
- planned scope copy distinguishes month-only and budget-plan-forward;
- zero-total planned month still renders edit hub;
- empty-plan guard applies to preview only;
- open target redirects to dashboard;
- unavailable/error/loading states render.

### Editor Confidence

Keep or extend selected-month tests:

- each editor targets planned `?yearMonth=`;
- each editor shows selected-month banner;
- each editor mutation uses selected month;
- closed/skipped selected months are read-only;
- invalid selected month does not silently fall back to open month.

### E2E / Smoke

Add one focused Playwright flow after page implementation:

1. seed user with open month and no planned next month;
2. visit dashboard;
3. navigate to `/dashboard/next-month`;
4. assert preview state;
5. click `Start planning next month`;
6. assert planned state;
7. click one pillar edit link;
8. assert editor has selected-month banner and planned month in URL.

Keep this narrow. Do not add broad dashboard matrix coverage here.

## Implementation Sequence

1. Extract page components from `NextMonthPreviewPage.tsx` without visual
   rewrite.
2. Port standalone layout section by section.
3. Wire mutation pending/success/error polish.
4. Keep current API contracts unchanged.
5. Update unit tests.
6. Add one smoke/E2E happy path.
7. Run focused validation:

```bash
cd Frontend
npx vitest run src/Pages/private/dashboard/NextMonthPreviewPage.test.tsx \
  src/domain/budget/nextMonthPreview.test.ts \
  src/hooks/budget/editPeriod/useEditorSelectedMonth.test.tsx
```

If frontend implementation touches editor links or selected-month behavior, add
the relevant editor selected-month tests to the command.

## Out Of Scope

- Backend rewrite of planned-month lifecycle.
- New global budget-plan editor route.
- Quick drawer editing planned/future months.
- Arbitrary future month planning.
- Multiple planned future months.
- Frontend-computed next-month totals.
- Navigation/menu redesign.

## Definition Of Done

- `/dashboard/next-month` visually matches the approved standalone direction.
- Preview and planned states are visually distinct.
- Start-planning CTA creates or enters planned month through existing endpoint.
- Planned state exposes real editor links with selected `yearMonth`.
- Scope copy makes "next month only" and "budget plan forward" distinct.
- No fake money appears anywhere.
- Tests cover preview, planned, mutation, and editor-link wiring.
