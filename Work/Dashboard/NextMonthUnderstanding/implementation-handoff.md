# Implementation Handoff

## Summary

This is not ready for a pure frontend implementation.

Dashboard clarity work can be implemented with existing data, but true next-month preview numbers and next-month-only editing require backend work first.

Recommended sequence:

1. Backend read-only next-month preview endpoint.
2. Frontend `/dashboard/next-month` preview page.
3. Dashboard three-card model and preview CTA.
4. MonthRail preview-aware Next button.
5. Optional editable planned-month backend model.
6. Optional editor route refactor for next-month-only editing.

## Recommended Implementation Sequence

### Phase 1: Backend Preview Read

Add:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Implementation notes:

- Do not call `EnsureAccessibleMonthAsync` for target next month.
- Do not call `BudgetMonthMaterializer`.
- Read base plan rows via `IBudgetMonthSeedSourceRepository` or a dedicated read repository.
- Build a `BudgetDashboardReadModel`.
- Reuse `BudgetDashboardProjector`.
- Include carry-over assumption from current live final balance if product wants estimated carry-over.

Tests:

- endpoint does not insert a `BudgetMonth`;
- endpoint does not materialize month tables;
- projected equation reconciles;
- preview with no carry-over;
- preview with estimated full carry-over;
- preview rejects/handles missing current month;
- preview handles empty budget data.

### Phase 2: Frontend Preview Route

Add:

- `appRoutes.dashboardNextMonth = "/dashboard/next-month"`.
- Route in `AppRoutes.tsx`.
- `NextMonthPreviewPage.tsx`.
- `useNextMonthPreviewQuery`.
- API client method in `budgetService.ts`.
- types for `NextMonthPreviewDto`.

Preview page:

- source current active/open month from `/months/status` or dashboard summary;
- call backend preview endpoint;
- show `Juni 2026 · Förhandsvisning`;
- show preview MoneyState-like surface only from preview DTO;
- show carry-over assumption;
- do not expose unsupported edit actions.

### Phase 3: Dashboard Three-Card Model

Likely files:

- `DashboardContent.tsx`
- `ReturningDashboardSection.tsx`
- new component under `returning/openMonth/`
- i18n under `utils/i18n/pages/private/dashboard/openMonth/`

Data:

- This month card uses existing `DashboardSummary`.
- Next month card uses preview availability and/or preview route state.
- Budget plan card uses no totals until backend plan summary exists.

Tests:

- cards render for open month;
- card copy avoids implementation terms;
- next card does not show money value if preview data missing;
- CTA routes to `/dashboard/next-month`.

### Phase 4: MonthRail Next Button

Likely files:

- `DashboardContent.tsx`
- `MonthRail.tsx`
- `dashboardHeaderState`/view-model builder if extracted later
- `dashboardMonthNavigation.ts`
- tests in `MonthRail.test.tsx` and `DashboardContent.test.tsx`

Change:

- distinguish persisted `nextPeriodKey` from preview route target.
- when on active/open month and preview available, enable Next as preview navigation.
- when persisted next exists, keep existing persisted navigation.

Do not:

- add fake next month into `monthsStatus.months`;
- call dashboard endpoint for unopened next month.

### Phase 5: Editable Next Month Model

Only if product insists that users can edit next month before current month closes.

Recommended backend model:

- add `planned` budget month status, or equivalent;
- planned month is materialized from budget plan but not active;
- planned month can be edited with next-month-only scope;
- current month remains the only `open` month;
- close current promotes planned next to open and applies final carry-over.

Files likely touched:

- DB schema/migrations/init scripts;
- `BudgetMonthStatuses`;
- lifecycle service;
- status DTO;
- dashboard DTO;
- editor mutation guards;
- close/start handlers;
- integration tests.

This is not a small UI tweak.

### Phase 6: Editor Route Refactor

Only after Phase 5.

Current issue:

- editor pages hardcode `openMonthYearMonth`.

Needed:

- route/query selected yearMonth;
- read-only/preview/planned state handling;
- scope labels;
- guard against editing closed/skipped months;
- ensure mutation hooks use selected route month.

Potential route options:

- keep existing `/dashboard/income` etc. for active month;
- add query param `?yearMonth=YYYY-MM` for planned/preview context;
- or add nested route later if the app adopts month-param routing.

## Files Likely To Change

### Frontend

- `Frontend/src/routes/appRoutes.ts`
- `Frontend/src/layout/AppRoutes.tsx`
- `Frontend/src/api/Services/Budget/budgetService.ts`
- `Frontend/src/hooks/budget/useNextMonthPreviewQuery.ts` (new)
- `Frontend/src/types/budget/NextMonthPreviewDto.ts` (new)
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/shell/MonthRail.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx` (new)
- i18n dictionaries for dashboard/preview page.

### Backend

- `Backend/Presentation/Controllers/Budget/BudgetController.MonthLifecycle.cs` or new partial controller file.
- `Backend/Application/Features/Budgets/Months/NextPreview/*` (new).
- `Backend/Application/DTO/Budget/Months/NextMonthPreviewDto.cs` (new).
- preview read-model builder service.
- repository read method for budget plan if seed source is insufficient.
- tests under `Backend.Tests`.

## API Calls / Hooks

Existing:

- `GET /api/budgets/months/status`
- `GET /api/budgets/dashboard`
- `GET /api/budgets/dashboard?yearMonth=YYYY-MM`
- `POST /api/budgets/months/{yearMonth}/close`
- `POST /api/budgets/months/start`

New:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Possible later:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
PATCH /api/budgets/months/{plannedYearMonth}/...
```

Only add later if planned-month editing is approved.

## Risks

- Accidentally materializing next month through existing dashboard/editor endpoints.
- Frontend editor routes mutating the open month while user thinks they are editing preview month.
- Presenting estimated carry-over as final.
- Showing budget-plan totals from frontend-derived math.
- Blurring current-month-only and budget-plan-forward scopes.
- Breaking the one-open-month invariant without a lifecycle design.

## Test Scenarios

### Dashboard

- Open month with no persisted next month:
  - current hero visible;
  - three cards visible;
  - Next routes to preview route only when preview support exists.
- Open month with persisted next month:
  - Next navigates to persisted month;
  - card copy does not say only preview.
- Closed month:
  - no edit affordances;
  - normal persisted navigation remains.
- Empty budget:
  - preview card does not show fake values.

### Preview Page

- Loads preview DTO and renders preview state.
- Displays estimated carry-over copy.
- Handles backend unavailable/error.
- Does not call `/dashboard?yearMonth={next}`.

### Backend

- Preview endpoint leaves `BudgetMonth` count unchanged.
- Preview endpoint returns correct projected totals from plan rows.
- Preview endpoint floors estimated carry-over at zero.
- Preview endpoint handles no active savings/debts/subscriptions.

### Edit Scope

- Month-only row hides plan-forward action.
- Source-linked row can show plan-forward action only where backend supports it.
- Closed/skipped mutations rejected.
- Planned-month mutations, if added, do not mutate current open month.

## Open Questions

1. Is editable next month required before current month closes, or is read-only preview enough for MVP?
2. Should preview include estimated carry-over by default, or show plan without carry-over?
3. Should `Budgetplan` card link anywhere in MVP, given current editor routes are active-month-oriented?
4. Should backend add a `planned` month status or a separate preview-edit model?
5. What should happen if current month is closed and no open month exists when visiting `/dashboard/next-month`?
6. Should the active Next button be enabled before preview backend exists? Recommendation: no.

## Backend Work Needed Before Frontend

Required before showing next-month numbers:

- read-only next-preview endpoint;
- preview DTO;
- preview read-model builder;
- backend tests proving no mutation.

Required before editing next month only:

- planned/draft month model or equivalent;
- routeable/editor-safe selected month support;
- mutation scope tests.

