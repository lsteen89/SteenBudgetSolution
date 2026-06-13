# Designer Handoff - `/dashboard/next-month`

## Purpose

We are building the dedicated next-month planning page:

```text
/dashboard/next-month
```

The page should help the user understand and act on this model:

```text
This month -> next month -> budget plan
```

Current branch already has a technical baseline. Treat it as working material,
not final design. The designer may change frontend structure and backend
contracts if needed. We want the best page possible, but it must still feel like
eBudget: calm, premium, trustworthy, financial, and consistent with the existing
app shell.

## Current Product Shape

The page has two real user states:

- **Preview**: next month does not exist yet. The page shows a read-only
  projection from the budget plan.
- **Planned**: user has created a planned next month. The page shows a real
  materialized month that can be edited before it becomes active.

The page also handles:

- unavailable state: no open month to project from;
- empty budget-plan state;
- loading state;
- API error state;
- defensive redirect if the next month is already open.

## Current UX Flow

From the open-month dashboard:

1. User sees the open-month hero.
2. Under it, `PlanningRow` shows three cards:
   - This month
   - Next month
   - Budget plan
3. The Next month card routes to `/dashboard/next-month`.
4. If backend preview is available, the dashboard also shows inline
   `NextMonthPreviewDetail`.
5. Full page shows the preview.
6. User can press "Start planning next month".
7. Backend creates a planned month.
8. Same page switches to planned state and exposes edit links for income,
   expenses, savings, and debts.

## What Exists Now

### Frontend

- Route:
  - `Frontend/src/routes/appRoutes.ts`
  - `dashboardNextMonth: "/dashboard/next-month"`
- Router:
  - `Frontend/src/layout/AppRoutes.tsx`
- Full page:
  - `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx`
- Dashboard entry surfaces:
  - `Frontend/src/components/organisms/dashboard/returning/openMonth/PlanningRow.tsx`
  - `Frontend/src/components/organisms/dashboard/returning/openMonth/NextMonthPreviewDetail.tsx`
- Shared preview logic:
  - `Frontend/src/domain/budget/nextMonthPreview.ts`
- API hooks:
  - `Frontend/src/hooks/budget/useNextMonthPreviewQuery.ts`
  - `Frontend/src/hooks/budget/usePlanNextMonthMutation.ts`
- DTOs:
  - `Frontend/src/types/budget/NextMonthPreviewDto.ts`
  - `Frontend/src/types/budget/PlanNextMonthResultDto.ts`
- Copy:
  - `Frontend/src/utils/i18n/pages/private/dashboard/pages/NextMonthPreviewPage.i18n.ts`
  - `Frontend/src/utils/i18n/pages/private/dashboard/openMonth/PlanningRow.i18n.ts`
  - `Frontend/src/utils/i18n/pages/private/dashboard/openMonth/NextMonthPreviewDetail.i18n.ts`

### Backend

- Read-only preview endpoint:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

- Create planned month endpoint:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
```

- Controller:
  - `Backend/Presentation/Controllers/Budget/BudgetController.MonthLifecycle.cs`
- Preview feature:
  - `Backend/Application/Features/Budgets/Months/NextPreview/*`
- Planned-month feature:
  - `Backend/Application/Features/Budgets/Months/PlanNextMonth/*`
- Backend DTOs:
  - `Backend/Application/DTO/Budget/Months/NextMonthPreviewDto.cs`
  - `Backend/Application/DTO/Budget/Months/PlanNextMonthResultDto.cs`

## Data Truths

The preview page must not fake money.

- Preview numbers come from backend `NextMonthPreviewDto.dashboard`.
- Frontend may format, classify, and compare backend numbers, but must not
  invent next-month totals.
- Preview is projected from the budget plan.
- Preview carry-over is an estimate from the current open month's live final
  balance, floored at zero.
- Estimated carry-over is not final until the current month closes.
- Planned month is different from preview: it is a real materialized month with
  editable rows.
- Closing the current month later promotes the planned month to open and applies
  final carry-over.

## Design Freedom

Designer is allowed to change backend if needed.

That includes:

- DTO shape;
- endpoint response fields;
- extra explanation fields;
- state labels;
- richer read models for design clarity;
- additional backend-owned comparison data;
- better planned-month metadata.

Do not treat the current API as sacred. If the best page needs better backend
data, change the backend properly instead of bending the UI around missing
data.

Hard rule: backend changes must preserve financial correctness, one-open-month
invariant, and no fake frontend math.

## eBudget Visual Rules

This page must look like eBudget.

Use the existing app language:

- calm blue shell/background;
- `--eb-*` tokens;
- existing surface/shadow grammar (`shadow-eb`, `bg-eb-surface`,
  `border-eb-stroke`, `text-eb-text`, `text-eb-muted`);
- restrained accent usage;
- clear money hierarchy;
- refined but quiet cards/sections;
- no marketing-page hero;
- no random new palette;
- no noisy gradients, gimmicks, glass overload, or SaaS-template dashboard soup.

Cards can be polished harder, but they must still belong beside the current
dashboard, MonthRail, and editor pages.

## Current Design Problems To Solve

The technical flow exists, but the page likely needs design work:

- Preview and planned states need stronger hierarchy.
- The transition from "preview" to "planned" should feel intentional.
- Money equation, allocation bar, and carry-over assumption need clearer visual
  grouping.
- "Start planning next month" is important, but should not feel dangerous or
  vague.
- Planned edit actions need better distinction between:
  - edit this planned month only;
  - update budget plan forward.
- Page should feel like a focused planning workspace, not a generic summary
  card stack.
- Empty/unavailable/error states should be polished enough for production, not
  placeholder panels.

## Suggested Page Composition

Strong direction, not a locked wireframe:

1. Header
   - "Next month"
   - month label
   - state pill: Preview or Planned
   - short state-specific explanation

2. Main money surface
   - free-to-allocate headline
   - equation: income + carry-over - expenses - savings - debts = remaining
   - allocation bar
   - carry-over assumption if applicable

3. Decision/action area
   - Preview state: create planned month
   - Planned state: edit next-month-only pillars

4. Scope explanation
   - concise distinction between planned-month edits and budget-plan-forward
     edits
   - no implementation terms

5. Supporting comparison
   - optional: how next month differs from this month
   - only if backend or existing DTO gives honest values

## Copy Direction

Good product words:

- This month
- Next month
- Budget plan
- Preview
- Planned
- Free to allocate
- Start planning next month
- Edit next month only
- Update budget plan forward
- Applies only to {month}
- Based on {month} closing with {amount} left

Avoid:

- baseline
- entity
- source rows
- materialized
- mutation
- fake precision
- guilt/shame language
- bank/spending-tracker wording
- long educational paragraphs

## Guardrails

Do not:

- show next-month money without backend data;
- hide that preview carry-over is estimated;
- imply preview rows are already editable;
- make current-month quick edit modify future months;
- imply "next month only" and "budget plan forward" are the same action;
- create multiple open months;
- redesign nav/account/menu/shell as part of this page;
- add unrelated dashboard features.

## Open Design Questions

- Should preview and planned share the same layout, or should planned feel more
  like an editor launchpad?
- How prominent should estimated carry-over be?
- Should "Start planning next month" be a primary CTA, a contained workflow
  panel, or a lower-risk secondary action?
- Should comparison against this month be always visible, collapsible, or moved
  back to dashboard-only?
- What should the planned-state edit hub look like so scope is obvious without
  excessive text?
- Does backend need to send richer labels/reasons for deltas so the UI can
  explain *why* next month differs?

## Designer Target

Make `/dashboard/next-month` feel like the natural next step from the open-month
dashboard: calm, clear, financially honest, and eBudget-native.

If the current implementation blocks a better design, change it. Frontend and
backend are both available. But do not break the product truth: money comes from
backend, preview is not final, planned month is real, and eBudget visual
identity stays intact.
