# Requirements

## Functional Requirements

### NM-001 Current Month Remains Primary

The dashboard must continue to show the active/open current month as the primary hero when the selected month is open.

Acceptance:

- Current `MoneyState`/remaining amount remains above next-month planning content.
- Current-month totals come from backend dashboard DTO.

### NM-002 Three-Card Model

The dashboard must include three compact model cards:

- This month
- Next month
- Budget plan

Acceptance:

- Cards use short labels, not long explanatory paragraphs.
- Cards are visible on desktop and mobile.
- Cards do not duplicate the main hero.

### NM-003 This Month Card

The This month card must show the selected/open month state.

Acceptance:

- Shows month label.
- Shows status (`Open`, `Closed`, `Skipped` or localized equivalent).
- Shows current free/remaining amount when live dashboard data exists.
- Provides `View breakdown` / `Se fördelningen` action.

### NM-004 Next Month Card

The Next month card must show the next planning target.

Acceptance:

- Shows next month label.
- Shows whether next month is preview/unopened or persisted/opened.
- Shows `Review next month` / `Granska nästa månad` as primary action when preview is available.
- Does not show projected money values unless backend preview DTO provides them.

### NM-005 Budget Plan Card

The Budget plan card must identify the recurring plan.

Acceptance:

- Uses user-facing copy such as `Budget plan` / `Budgetplan`.
- Avoids implementation terms such as `default`, `baseline`, `source`, `entity`, `override`.
- Shows plan totals only if backend provides a plan/preview summary.
- Provides `Edit plan` / `Redigera budgetplan` only where the target route actually supports plan editing.

### NM-006 Active Next Button

When the user is viewing the active/open month and no persisted next month exists, the MonthRail Next button must route to next-month preview once backend preview support exists.

Acceptance:

- Button is enabled only when preview route and data support exist.
- Button routes to the same destination as `Review next month`.
- Button does not call `/api/budgets/dashboard?yearMonth={next}` for unopened months.

### NM-007 Persisted Next Month Navigation

When a persisted next month exists, Next must navigate to that persisted month.

Acceptance:

- Existing month navigation remains for persisted rows.
- UI does not label an already opened/persisted month as only a preview.

### NM-008 Preview Page

The app must provide a dedicated next-month preview page.

Acceptance:

- Route: `/dashboard/next-month`.
- Page heading includes month and preview state, for example `Juni 2026 · Förhandsvisning`.
- Page states clearly that this is not the active current month.
- Page handles loading, error, no-budget-data, and unavailable-preview states.

### NM-009 Preview Data Source

Next-month preview numbers must come from a backend preview endpoint.

Acceptance:

- No frontend-only aggregation of next-month totals.
- No use of `/api/budgets/dashboard?yearMonth={next}` for unopened next month preview.
- Preview DTO includes preview basis and limitations.

### NM-010 Carry-Over Assumption

If preview includes carry-over before close, the UI must label it as estimated.

Acceptance:

- Copy states that amounts are finalized when current month closes.
- Full carry-over estimate uses backend-provided value.
- Negative current final balance does not become negative carry-over; full carry-over floors at zero.

### NM-011 Edit Scope Clarity

The preview page must separate next-month-only edits from budget-plan edits.

Acceptance:

- UI labels current scope near every edit action.
- Swedish copy options include:
  - `Gäller bara juni`
  - `Uppdatera budgetplanen framåt`
  - `Endast budgetplanen framåt`
- Month-only rows do not expose plan-forward actions.

### NM-012 Quick Drawer Exclusion

The current dashboard quick drawer must remain current-month-only.

Acceptance:

- No next-month preview editing is added to `EditPeriodDrawer`.
- Dashboard quick actions continue to mutate only the open current month.

### NM-013 Closed/Skipped Protection

Closed and skipped months must expose no edit affordances.

Acceptance:

- Dashboard hides quick edit, close, next-month edit actions where month is closed/skipped.
- Backend mutations continue rejecting non-open months.

## UX Requirements

### NM-014 Calm Dashboard

The dashboard must feel calmer after the change, not busier.

Acceptance:

- Three cards are compact.
- Long help copy is removed from the model area.
- One primary next-month action exists.

### NM-015 Copy Rules

UI copy must use user-facing budget language.

Acceptance:

- Allowed: `This month`, `Next month`, `Budget plan`, `Review next month`.
- Swedish preferred: `Denna månad`, `Nästa månad`, `Budgetplan`, `Granska nästa månad`.
- Banned in UI: `default`, `baseline`, `source`, `entity`, `override`.
- No shame/guilt language.

### NM-016 Preview Label

Preview state must be visible wherever preview numbers or preview actions are shown.

Acceptance:

- Preview page header includes `Preview` / `Förhandsvisning`.
- Preview card includes a short preview state label.
- Persisted/opened month state uses different copy.

## Data Requirements

### NM-017 Current Month Data

This month card and hero use existing `BudgetDashboardMonthDto` / `DashboardSummary`.

Acceptance:

- No new endpoint needed for current month card.

### NM-018 Next Month Preview Data

Backend must provide a `NextMonthPreviewDto`.

Acceptance:

- Includes `fromYearMonth`.
- Includes `previewYearMonth`.
- Includes preview `dashboard` totals.
- Includes carry-over assumption.
- Includes limitations/warnings.
- Guarantees read-only/non-mutating behavior.

### NM-019 Budget Plan Summary Data

Budget plan totals require backend-owned summary.

Acceptance:

- Either returned by next-preview endpoint as `basis`/plan values, or a separate `GET /api/budgets/plan/summary`.
- Frontend does not aggregate editor source rows into plan totals.

## Routing Requirements

### NM-020 Frontend Route

Add route constant and route registration for next-month preview.

Acceptance:

- `appRoutes.dashboardNextMonth = "/dashboard/next-month"`.
- Route renders inside authenticated confirmed dashboard shell.

### NM-021 MonthRail Preview Action

MonthRail view-model must support preview navigation separately from persisted month navigation.

Acceptance:

- Persisted next month uses existing `onGoNext`.
- Preview next month uses route navigation.
- Disabled state is correct during fetch/switching.

## Backend Requirements

### NM-022 Read-Only Preview Endpoint

Add read-only next-preview endpoint.

Acceptance:

- `GET /api/budgets/months/{fromYearMonth}/next-preview`.
- Does not insert `BudgetMonth`.
- Does not materialize month tables.
- Uses budget-plan rows.
- Uses backend dashboard projection math.

### NM-023 Preview Read Model

Backend must build a preview read model from budget-plan rows.

Acceptance:

- Reuses `BudgetDashboardProjector`.
- Does not reuse `BudgetMonthMaterializer` directly.
- Applies the same active-row filters as materialization.

### NM-024 Editable Preview Model

If MVP requires editing next month only before close, backend must add a real editable future-month model.

Acceptance:

- Current month remains the only open month.
- Future editable state is distinguishable from open/closed/skipped.
- Final close/open flow promotes or merges preview edits deterministically.
- Mutations have tests for next-month-only vs budget-plan scope.

## Guardrails / Non-Goals

### NM-025 No Fake Preview

Frontend must not fabricate next-month numbers.

### NM-026 No Dashboard Endpoint Abuse

Frontend must not use `/dashboard?yearMonth={next}` to preview unopened next month.

### NM-027 No Quick Drawer Scope Creep

Current quick drawer remains current-month-only.

### NM-028 No Advanced Planning Expansion

Do not include yearly planning, analytics, bank integrations, AI advice, exports, or sharing.

### NM-029 No Multiple Open Months Without Design

Do not bypass the one-open-month invariant casually.

