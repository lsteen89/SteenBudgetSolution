# Refined Scope

## Product Goal

Before MVP launch, the dashboard must make the budget-month model obvious:

- `This month` is the active persisted budget month that applies now.
- `Next month` is the next planning target.
- `Budget plan` is the recurring setup future months start from.

The dashboard should teach this through structure and short labels, not long explanatory copy.

## Technical Truth

The current system supports persisted month lifecycle well. It does not yet support a safe editable unopened next month.

Current truth:

- The dashboard can show the current/open month.
- The dashboard can show existing closed/skipped/open months from persisted `BudgetMonth` rows.
- The backend can open/start a target month and can close current month and create/configure the next month.
- The backend can edit an existing open `BudgetMonth`.
- The frontend editor pages currently edit `openMonthYearMonth`, not a selected route month.
- The backend has no read-only next-month preview endpoint.
- The backend has no `preview`, `planned`, or `draft` budget month status.
- `GET /api/budgets/dashboard?yearMonth=...` is not a preview endpoint because it calls lifecycle ensure/materialization.

So the feature cannot be delivered honestly as “editable unopened next month” with frontend-only work.

## In Scope

### Dashboard Clarity

- Keep the current month hero as the primary dashboard answer.
- Add a secondary next-month planning surface/card.
- Replace the large explanatory area under the hero with three smaller cards:
  - This month
  - Next month
  - Budget plan
- Remove long helper/explanation text from that area.
- Use short state labels and direct actions.
- Keep current dashboard money math backend-owned.

### Next Button Behavior

- When viewing the active/open month and no persisted next month exists, the Next button should route to the next-month preview route once backend preview support exists.
- When a persisted next month exists, the Next button should navigate to that real month instead of pretending it is only a preview.
- The Next button must visually communicate whether it is navigating to a persisted month or a preview state.

### Next-Month Preview Page

- Add a dedicated route/page for next-month preview.
- Recommended frontend route: `/dashboard/next-month`.
- The page should be derived from the current active month, not an arbitrary route param for MVP.
- Page heading should clearly label preview state:
  - Swedish: `Juni 2026 · Förhandsvisning`
  - English: `June 2026 · Preview`
- The page must make clear that the preview is not the active/current month.
- The page may reuse dashboard money-state/pillar visuals only after backend returns a real preview DTO.

### Backend Preview Contract

Add a backend read-only preview endpoint before showing next-month numbers.

Recommended endpoint:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

It should:

- not insert a `BudgetMonth`;
- not materialize month rows;
- read active budget-plan rows;
- project them through existing dashboard math;
- return preview year-month, basis, carry-over assumption, dashboard totals, limitations, and state flags.

### Edit Scope Clarity

The UI must distinguish:

| User action | Meaning |
| --- | --- |
| Edit next month only | Changes the previewed next month only |
| Edit budget plan | Changes recurring plan/future months |

This distinction needs backend support before it can be offered for an unopened next month.

## Out Of Scope

- Full dashboard redesign.
- Bank integrations, transactions, spend tracking, burn rate, due dates, AI advice.
- Yearly planning or advanced analytics.
- Fake frontend-only next-month projections.
- Using `/api/budgets/dashboard?yearMonth={next}` as preview.
- Putting future-plan editing into the quick current-month drawer.
- Multiple open months without an explicit lifecycle design.

## User-Facing Behavior

### Dashboard

The user lands on `/dashboard` and sees:

1. Current active month hero remains dominant.
2. A compact next-month card/surface with one primary action:
   - `Granska nästa månad`
   - `Review next month`
3. A three-card model that shows:
   - current month state;
   - next month state/action;
   - budget plan as the source for future months.

### Next Button

If the current active month has no persisted next month:

- Next button routes to `/dashboard/next-month`.
- It represents a preview route, not normal persisted-month navigation.

If the next month exists:

- Next button selects/navigates to the persisted next month.
- UI copy should avoid calling it only a preview.

### Preview Page

The preview page shows:

- preview month label;
- preview status;
- projected money state, if backend preview exists;
- carry-over assumption;
- clear edit-scope actions;
- entry points to edit next month only and/or budget plan only if backend supports those scopes.

## State Scope

### State 1: Current Open, Next Not Opened

Required:

- Dashboard shows current month as active.
- Next card and Next button route to preview.
- Preview page uses backend read-only preview endpoint.
- Editing next month only is disabled or unavailable until backend supports a preview/draft month edit model.

### State 2: Current Open, Next Already Opened/Persisted

Current backend invariant allows only one open month. Therefore this state is not generally valid unless product introduces a new non-open future-month status.

If a next persisted month exists after close/start:

- current month is likely closed/skipped, not still open;
- navigation can show the persisted next month normally.

### State 3: Current Closed/Read-Only

Required:

- no edit affordances for closed month;
- adjacent persisted month navigation remains;
- preview route should derive from the active/open month if one exists, otherwise show a clear unavailable state.

### State 4: Preview Supported

Required:

- use backend preview DTO;
- show preview label;
- show estimated carry-over only as an assumption;
- no frontend-only financial math beyond display shaping.

### State 5: Preview Unsupported

Required:

- do not show next-month numbers;
- do not activate Next into a fake numeric preview;
- document backend blocker.

### State 6: Month-Only Rows

Required:

- month-only rows must not show plan-forward controls;
- source-linked rows may expose plan-forward controls where backend supports them.

### State 7: No Meaningful Budget Data

Required:

- show setup/empty state;
- disable preview numbers;
- next-month card may say the preview needs budget-plan data.

## Known Risks

- Highest risk: presenting projected next-month figures without backend support.
- High risk: blurring “next month only” with “budget plan forward.”
- High risk: using current `/dashboard?yearMonth=next` and accidentally creating/materializing a real month.
- Medium risk: adding route params to editor pages without making their mutations respect the selected month.
- Medium risk: enabling Next button while it still only knows persisted months.

