# PR 7 — Debt Add And Edit Flows

| | |
| --- | --- |
| **Type** | Frontend behavior/UI |
| **Depends on** | PR 2 + PR 5 + PR 6 |
| **Blocks** | PR 10 |
| **Risk** | Medium — scope and balance copy must be exact |

## Purpose

Wire `Lägg till skuld`, `Redigera uppgifter`, and planned-payment edit flows to
the PR 2 backend. Keep balance adjustment and lifecycle actions out of this PR.

## Dependencies

- PR 2 create/edit endpoints are implemented and tested.
- PR 5 read model exposes permissions and disabled reasons.
- PR 6 page shell exists.

## Frontend Scope

Build/wire:

- add debt drawer/modal
- edit metadata drawer/modal
- edit planned monthly payment drawer/modal if not already production-ready
- scope cards:
  - `Bara denna månad`
  - `Denna månad + planen framåt`
  - `Bara planen framåt`
- validation display from backend responses
- query invalidation for debt editor and dashboard/month editor reads
- disabled scope behavior for month-only rows

Do not wire:

- `Uppdatera saldo`
- `Hoppa över denna månad`
- `Inkludera i maj`
- `Markera som betald`
- `Arkivera`
- `Återställ`
- progress/history UI

## Files / Areas Likely Touched

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtPlannedPaymentModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtDetailsModal.tsx` or equivalent
- `Frontend/src/Pages/private/debts/components/DebtCreateModal.tsx` or equivalent
- `Frontend/src/Pages/private/debts/components/DebtScopeCards.tsx` if introduced
- `Frontend/src/Pages/private/debts/utils/*`
- `Frontend/src/schemas/dashboard/monthEditor/*` if client schemas are used
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/utils/i18n/pages/private/debts/*`
- tests beside changed components/utils

## DTO / API Contracts Used

Create:

```text
POST /api/budgets/months/{yearMonth}/debt-items
```

Edit details:

```text
PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/details
```

Planned payment:

```text
PATCH /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}
```

or the superseding PR 2 details route if backend intentionally consolidates it.

Requests must pass backend scope values exactly:

- `currentMonthOnly`
- `currentMonthAndBudgetPlan`
- `budgetPlanOnly`

## UX Contract

Add debt fields:

- name
- type
- current balance
- APR
- monthly fee
- minimum payment
- term months
- planned monthly payment

Edit details fields:

- name
- type
- APR
- monthly fee
- minimum payment
- term months

Planned payment field:

- planned monthly payment only

Rules:

- balance can be entered on create only
- edit-details shows balance as read-only with copy pointing to future
  `Uppdatera saldo`
- planned-payment drawer must include `Saldo påverkas inte här`
- min-payment warning is advisory amber, not blocking/red
- preview deltas are neutral; they show monthly cash impact, not moral judgment
- plan scopes disabled for month-only rows with plain reason copy
- closed/skipped months hide mutation affordances

## Validation Rules

- client validation mirrors backend where helpful, but backend is authoritative
- backend field errors render next to fields
- invalid scope cannot be submitted from the UI
- month-only rows cannot select plan scopes
- add/edit success refetches PR 5 read model and dashboard totals

## Audit / History Behavior

No frontend audit logic. The UI should not invent history messages. It can show a
success state only after backend success.

## Dashboard / Month-Close / Recap Impact

- current-month create/edit can change debt payment total
- plan-only create/edit must leave current month total unchanged
- planned-payment edit must leave balance visually unchanged
- after success, dashboard/month editor queries invalidate so the equation
  reconciles from backend data

## Acceptance Criteria

- Add debt works for all backend-supported create scopes.
- Edit details works for all valid edit scopes.
- Planned payment edit works and does not imply balance reduction.
- Month-only plan scopes are disabled or rejected with clear copy.
- Backend validation errors are visible.
- Closed/skipped months expose no add/edit affordances.

## Tests To Add

- add form default scope and successful submit
- add current-month-only sends correct scope
- add current+plan sends correct scope
- add plan-only sends correct scope and does not expect current row immediately
- edit details sends selected scope
- planned payment edit keeps balance copy visible
- month-only row disables plan scopes
- backend validation errors render
- query invalidation after success
- read-only month hides add/edit

## Validation

```bash
cd Frontend
npx vitest run src/Pages/private/debts src/utils/i18n/pages/private/debts
npm run build
```

## Explicit Non-Goals

- No balance update flow.
- No lifecycle action flow.
- No progress/history UI.
- No backend changes.
