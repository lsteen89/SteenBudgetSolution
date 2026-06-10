# Reviewer Handover: Next-Month Preview And Dashboard MVP

## Role

You are reviewing the planned PR catalog before implementation.

Do not implement code from this handover. Your job is to check whether the PR split is safe, ordered, testable, and faithful to the product decision.

## Product Decision

The correct architecture is two-step:

1. MVP: read-only next-month preview and dashboard clarity.
2. Later: persisted `planned` month model for real next-month-only editing.

Preview-only is safe now. Real next-month editing is not safe without a `planned` lifecycle state or equivalent persisted model.

## What Is Being Changed

MVP changes:

- current dashboard hero remains the main answer;
- dashboard adds/keeps a next-month preview surface;
- primary next-month CTA becomes `Review next month` / `Granska nästa månad`;
- `/dashboard/next-month` becomes the dedicated preview destination;
- the conceptual model is shown as:
  - This month;
  - Next month;
  - Budget plan;
- the current explanatory/help panel is removed;
- three standalone cards are placed underneath the next-month preview card, matching the approved standalone HTML intent;
- dashboard Next button becomes preview-aware.

Later changes:

- add `planned` month lifecycle;
- allow next-month-only editing through persisted planned rows;
- refactor editor routes/hooks to support selected month;
- expose planned next-month edit UX.

## Standalone HTML Warning

The user will attach standalone HTML for the new dashboard features.

Use it as a visual and interaction reference only for the approved dashboard pieces:

- next-month preview card;
- three standalone cards under the preview card;
- CTA wording and placement direction;
- compact model for this month, next month, and budget plan.

Do not implement anything else from the standalone HTML.

Specifically do not implement:

- menu/nav redesign;
- unrelated dashboard sections;
- new analytics/workbench concepts;
- unapproved future planning surfaces;
- extra interactions that are not in the PR catalog.

If the standalone HTML conflicts with the PR catalog, the agent must ask before implementing.

## Reviewer Focus

Check that each PR:

- keeps financial math backend-owned;
- avoids `/api/budgets/dashboard?yearMonth={next}` for preview;
- avoids frontend-calculated preview totals;
- avoids month materialization in read-only preview;
- preserves the one-open-month invariant;
- separates current-month, planned-month, and budget-plan edit scopes;
- has enough tests to prove lifecycle and financial correctness;
- does not smuggle future editing into the MVP.

## Architecture Recommendation

Use backend read models and existing dashboard projection for preview numbers.

For MVP:

- add a dedicated read-only preview endpoint;
- render a read-only preview page;
- update dashboard layout and navigation;
- no persisted next-month editing.

For later editing:

- add `BudgetMonth.Status = planned`;
- allow one planned immediate-next month per budget;
- promote planned month to open during close flow;
- apply final carry-over at close/promotion time;
- never silently rewrite budget-plan rows from planned-month edits.

## Rejected Alternatives

### Use `/api/budgets/dashboard?yearMonth={next}`

Rejected. It is not a preview endpoint and can materialize or fail through lifecycle behavior.

### Frontend-calculated preview

Rejected. Financial preview math belongs in the backend.

### Multiple open months

Rejected for this roadmap. It changes a core lifecycle invariant and would require broader migration, lifecycle, editor, and reporting work.

### Automatically write planned edits to budget plan on close

Rejected. It creates hidden future side effects. Next-month-only edits must stay month-only unless the user explicitly chooses plan-forward scope.

## State Matrix

| State | Dashboard behavior | Next button | Preview page |
| --- | --- | --- | --- |
| Open current, no persisted next | Show current hero, next preview CTA, approved cards | Route to `/dashboard/next-month` if preview available | Read-only preview |
| Open current, preview unavailable | Show no fake next numbers | Disabled or unavailable | Unavailable state |
| Persisted next exists | Navigate/select real persisted month | Normal month navigation | Redirect/select real month if appropriate |
| No active open month | Show lifecycle unavailable state | Disabled | Unavailable state |
| Planned month exists later | Show planned state | Navigate to planned/open-aware destination | Planned dashboard/edit entry |
| Closed/skipped month | Read-only | Persisted navigation only | Derived from active open month, otherwise unavailable |

## Carry-Over Rules

- Before close: carry-over is estimated only.
- Recommended estimate:

```text
estimatedFullCarryOver = max(currentLive.finalBalanceWithCarryMonthly, 0)
```

- Mark estimated carry-over as non-final.
- Final carry-over is applied only from the close snapshot.
- Negative current balance does not create negative estimated carry-over in preview.

## Route Model

MVP route:

```text
/dashboard/next-month
```

Do not add arbitrary future preview routes yet:

```text
/dashboard/months/{yyyy-MM}/preview
```

That implies broader future-month support the app does not have.

## API Contract Recommendation

MVP:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

Later:

```http
POST /api/budgets/months/{fromYearMonth}/next-planned
GET /api/budgets/months/{plannedYearMonth}/planned-dashboard
```

Only add later endpoints after the `planned` lifecycle is approved and tested.

## Edit-Scope Rules

| Scope | Meaning |
| --- | --- |
| `currentMonthOnly` | Edit current open month only |
| `plannedMonthOnly` | Edit next planned month only |
| `plannedMonthAndBudgetPlan` | Edit planned month and recurring plan |
| `budgetPlanOnly` | Edit recurring plan only |

Month-only rows must not show plan-forward actions unless backend has a valid source link.

## Rollout Strategy

1. Ship backend preview contract.
2. Ship preview page.
3. Ship dashboard MVP layout, including the deliberate standalone-card replacement.
4. Ship preview-aware Next button.
5. Stop and evaluate.
6. Only then start planned-month lifecycle work.

## Review Output Expected

Give findings first. Be blunt.

Call out:

- unsafe lifecycle assumptions;
- fake frontend math;
- hidden materialization;
- ambiguous edit scopes;
- missing tests;
- standalone HTML scope leakage.

## Full PR List

- PR 1: Backend read-only next-month preview. Adds safe backend-owned preview numbers without materializing a month.
- PR 2: Frontend `/dashboard/next-month` preview page. Adds the dedicated read-only preview route.
- PR 3: Dashboard MVP layout and cards. Adds approved dashboard model, CTA change, preview card, and standalone card replacement.
- PR 4: Preview-aware Next button. Enables Next to route to preview when no persisted next month exists.
- PR 5: Planned month backend model. Adds persisted `planned` month lifecycle for real next-month-only editing.
- PR 6: Editor selected-month refactor. Makes full editor pages safely target selected open/planned months.
- PR 7: Planned next-month edit UX. Adds explicit next-month-only and budget-plan-forward edit actions.

Agent saying: Ready for your next decision
