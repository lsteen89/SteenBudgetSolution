# Start Planning Next Month - Future Wiring Spec

## Purpose

Define what remains after the page implementation PR if we want the full
"planning workspace" hinted at by the standalone design.

Important: the core `Start planning next month` action already exists. This
document is not asking to rebuild it. It defines the next layer:

- stronger post-planning flow;
- global budget-plan-forward editing if product wants it;
- richer backend-owned comparison reasons;
- explicit lifecycle audit/read models for the next-month workspace.

## Current Baseline

Already built:

- `POST /api/budgets/months/{fromYearMonth}/next-planned`
- `planned` budget month status;
- one planned month max per budget;
- planned month must be immediate next month;
- planned month materializes from budget-plan rows;
- planned month stays editable;
- current month stays open;
- close current month promotes planned month to open;
- selected editor routes support planned month via `?yearMonth=YYYY-MM`;
- editor scope controls support:
  - `currentMonthOnly`
  - `currentMonthAndBudgetPlan`
  - `budgetPlanOnly`

Current user flow:

1. Preview next month.
2. Click `Start planning next month`.
3. API creates planned month.
4. Page re-renders as planned.
5. User opens income/expenses/savings/debts editors scoped to planned month.
6. Inside editors, user chooses selected-month-only or plan-forward scope per
   supported row/action.

## The Naming Problem

Backend scope names are historical:

```text
currentMonthOnly
currentMonthAndBudgetPlan
budgetPlanOnly
```

On planned-month editor routes, `currentMonthOnly` really means "selected month
only", not necessarily the currently open month. UI copy must never expose the
wire name.

Preferred user copy:

- `Only for June 2026`
- `June 2026 and future months`
- `Budget plan going forward only`

Do not write:

- `current month only` on a planned-month page;
- `default`;
- `baseline`;
- `source`.

## Future Decision 1: Is Global Budget-Plan Editing Required?

The standalone shows an "Update your budget plan" concept. Current app does not
have a single global budget-plan editor page.

### Option A - No Global Plan Editor

Recommended for next PR.

Behavior:

- `/dashboard/next-month` explains budget-plan-forward edits.
- User enters a pillar editor.
- Each row/action exposes plan-forward scope where backend supports it.

Pros:

- uses existing implementation;
- avoids a new API surface;
- keeps scope close to the actual row being changed;
- lower risk of accidental plan mutation.

Cons:

- less direct than standalone prototype;
- user must choose a pillar first.

Build needed:

- page copy and visual treatment only;
- no backend change.

### Option B - Dedicated Budget Plan Editor

Only build if product wants "change every future month" as a first-class page.

Possible route:

```text
/dashboard/budget-plan
```

or:

```text
/dashboard/next-month/budget-plan
```

Needed backend:

```http
GET /api/budgets/plan
PATCH /api/budgets/plan/income
PATCH /api/budgets/plan/expenses
PATCH /api/budgets/plan/savings
PATCH /api/budgets/plan/debts
```

Alternative: reuse existing row mutations with `budgetPlanOnly`, but that still
needs a page-level read model.

Read model must include:

- income plan rows;
- expense plan rows;
- savings base amount and goal rows;
- debt rows and recurring payment assumptions;
- row source ids;
- whether row can be edited plan-forward;
- projected next-month dashboard after proposed plan changes.

Hard rules:

- never mutate open month unless user selects "this month and plan";
- never mutate planned month unless user selects "planned month and plan";
- plan-only edits affect future month materialization, not closed snapshots;
- if a planned month already exists, decide whether plan-only edits should
  update it. Default answer: no, because planned month is already materialized.

This is not needed for the standalone page port.

## Future Decision 2: Should Planned Month Re-Sync After Plan Edits?

Current rule:

- planned month materializes once;
- later budget-plan edits do not automatically re-sync planned month rows.

Keep this unless there is a strong product reason.

Why:

- planned month is user-edited real data;
- automatic re-sync can overwrite intentional June-only changes;
- close flow must preserve planned edits.

If product wants re-sync:

- add explicit user action: `Apply updated budget plan to planned month`;
- show a diff before applying;
- backend must merge safely and preserve month-only overrides;
- integration tests must cover row-level conflict behavior.

Do not silently re-sync.

## Future Decision 3: Rich Delta Reasons

Current comparison can show numeric term deltas:

- income;
- carry-over;
- expenses;
- savings;
- debts.

It cannot honestly explain detailed reasons like:

```text
Freelance income is not part of your budget plan.
Subscriptions pause next month.
Debt payment changes because this debt was skipped.
```

To support reason text, add backend-owned delta data.

Possible endpoint extension:

```json
{
  "deltas": [
    {
      "key": "income",
      "label": "Income",
      "current": 51700,
      "next": 38500,
      "delta": -13200,
      "reasonCode": "HOUSEHOLD_MEMBER_NOT_IN_PLAN",
      "affectedRows": [
        { "id": "...", "name": "Anna", "amount": 13200 }
      ]
    }
  ]
}
```

Use reason codes, not backend prose, if localization remains frontend-owned.

Needed reason categories:

- not in budget plan;
- starts next month;
- ends before next month;
- paused/cancelled;
- month-only override;
- planned row differs from budget plan;
- carry-over estimated;
- debt participation differs.

Do not infer these reasons in frontend from display labels.

## Future Decision 4: Post-Planning Success Flow

Current behavior:

- mutation invalidates queries;
- page becomes planned because `/months/status` now includes planned month.

Future polish:

- success ribbon: "June is planned";
- automatic focus move to planned edit hub;
- route remains `/dashboard/next-month`;
- no full page reload;
- mutation duplicate-click protection;
- mutation failure panel/toast with retry;
- analytics/event hook if analytics ever exists.

Data needed:

- `PlanNextMonthResultDto.wasCreated`
- `plannedYearMonth`
- `status`

Already available. No backend change needed.

## Future Decision 5: Planned Month Workspace Read Model

Current planned state reads:

```http
GET /api/budgets/dashboard?yearMonth={plannedYearMonth}
```

This is enough for money totals.

If page needs a richer workspace, add:

```http
GET /api/budgets/months/{plannedYearMonth}/planning-workspace
```

Only add if needed by design.

Possible payload:

- planned dashboard totals;
- month label and lifecycle status;
- from-month label;
- estimated vs final carry-over status;
- per-pillar edit availability;
- count of month-only rows;
- count of plan-linked rows;
- latest planned-month lifecycle event;
- whether close will promote this planned month.

Do not add this endpoint just to avoid composing existing hooks.

## Future Decision 6: Start Planning Page vs Same Page

Current behavior is same-page transition:

```text
preview /dashboard/next-month
  click start planning
planned /dashboard/next-month
```

Recommended: keep same page.

Reason:

- route represents the next-month workspace;
- preview and planned are lifecycle states of same workspace;
- no need for `/dashboard/next-month/start` unless we add a confirmation flow.

Only add a separate page if start planning becomes a multi-step decision:

- choose carry-over assumption;
- choose which plan rows to materialize;
- review plan differences;
- confirm side effects.

That would require new backend contracts and is not needed now.

## Future API Additions

Only if product approves the richer future:

### Budget Plan Summary

```http
GET /api/budgets/plan/summary
```

Purpose:

- let `/dashboard/next-month` show budget-plan totals without frontend math.

### Budget Plan Editor

```http
GET /api/budgets/plan
PATCH /api/budgets/plan/{pillar}
```

Purpose:

- first-class global recurring plan editing.

### Next-Month Delta Reasons

```http
GET /api/budgets/months/{fromYearMonth}/next-preview?includeDeltas=true
```

or add deltas to default preview DTO if stable.

Purpose:

- backend-owned reason codes for comparison UI.

### Planning Workspace

```http
GET /api/budgets/months/{plannedYearMonth}/planning-workspace
```

Purpose:

- one payload for planned workspace metadata.

## Future Tests

### Backend

- plan-only edit does not mutate open month;
- plan-only edit does not mutate existing planned month unless explicit re-sync
  action is implemented;
- selected planned-month edit mutates planned rows only;
- selected planned-month + plan edit mutates both planned row and plan row;
- planned close promotion preserves planned edits;
- delta reason endpoint returns reason codes from real source data.

### Frontend

- planned editor copy says selected month, not current month;
- budget-plan-forward scope is disabled for month-only rows;
- plan-only scope is visually distinct from selected-month-only;
- start-planning success ribbon appears;
- failed start-planning mutation keeps preview state and shows retry;
- global plan editor link is absent unless real route exists.

### E2E

1. Preview next month.
2. Start planning.
3. Planned state appears.
4. Edit one planned expense month-only.
5. Return to next-month page.
6. Planned total reflects edit.
7. Close current month.
8. Former planned month becomes open.
9. Planned edit survives promotion.

Add a second E2E only if global budget-plan editor is built:

1. Open budget-plan editor from next-month workspace.
2. Edit plan-only value.
3. Verify open month is unchanged.
4. Verify next fresh materialized month uses new plan value.

## Recommended Roadmap

### PR A - Page Port

Use `next-month-page-implementation-and-wiring.md`.

No backend change.

### PR B - Start-Planning Polish

Add:

- success ribbon;
- mutation error display;
- focus management;
- one E2E happy path.

No backend change expected.

### PR C - Scope Copy Hardening

Audit full editor pages opened with planned `?yearMonth=`.

Fix copy so it says selected month, not current month, everywhere user-visible.

No backend change expected unless a page still cannot target planned month.

### PR D - Rich Delta Reasons

Backend + frontend.

Only if design needs reason-level comparison.

### PR E - Global Budget Plan Editor

Backend + frontend.

Only if product wants a real "change every month" CTA from the next-month
workspace.

## Non-Negotiables

- No frontend-computed money.
- No quick drawer future editing.
- No multiple open months.
- No multiple planned future months.
- No silent plan-forward mutation.
- No automatic planned-month re-sync after plan edits.
- No global plan CTA without a real route and backend contract.

## Definition Of Ready For Future Work

Before building anything beyond the page port, answer:

1. Do we want a global budget-plan editor, or row-level plan-forward scope only?
2. Should existing planned months remain detached from later plan edits?
3. Do we need reason-level deltas, or are term-level deltas enough?
4. Is same-page start-planning transition enough, or do we need a confirmation
   flow?
5. Which E2E account/month should own the next-month planning happy path?
