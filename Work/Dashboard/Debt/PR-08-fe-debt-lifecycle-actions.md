# PR 8 — Debt Lifecycle Actions UI

| | |
| --- | --- |
| **Type** | Frontend behavior/UI |
| **Depends on** | PR 4 + PR 5 + PR 6 |
| **Blocks** | PR 10 |
| **Risk** | High — lifecycle copy must be precise and financially honest |

## Purpose

Wire the backend lifecycle and month participation actions from PR 4. The UI must
not imply a skipped debt is gone, a paid-off status is proof of an actual
payment, or archive is deletion.

## Dependencies

- PR 4 action endpoints are implemented.
- PR 5 action permissions and disabled reasons are implemented.
- PR 6 shell and action menus exist.

## Frontend Scope

Wire:

- `Hoppa över denna månad`
- `Inkludera i maj`
- `Markera som betald`
- `Arkivera`
- `Återställ`
- safe remove for month-only rows where backend permits it

Build:

- confirmation dialog variants
- per-group action menus from backend permissions
- disabled action copy from reason codes
- query invalidation/refetch after action success
- non-optimistic state refresh unless the action response includes the updated row

Do not wire:

- balance update
- progress/history view
- edit details
- add debt

## Files / Areas Likely Touched

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerSection.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLifecycleConfirmDialog.tsx`
- `Frontend/src/Pages/private/debts/components/DebtRowActionsMenu.tsx`
- `Frontend/src/Pages/private/debts/utils/*`
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/utils/i18n/pages/private/debts/*`
- tests beside changed components/utils

## DTO / API Contracts Used

Use PR 4 routes:

- `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/participation`
- `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/mark-paid-off`
- `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/archive`
- `POST /api/budgets/months/{yearMonth}/debt-items/{sourceDebtId}/restore`
- `POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/remove`

Exact path names follow the backend implementation, but frontend must keep one
typed API wrapper per action.

Use PR 5 fields:

- `Actions.CanSkipThisMonth`
- `Actions.CanIncludeThisMonth`
- `Actions.CanMarkPaidOff`
- `Actions.CanArchive`
- `Actions.CanRestore`
- `Actions.CanRemove`
- `DisabledReasons`

## UX Contract

Skip confirmation must say:

- payment is not counted this month
- balance remains owed
- plan/source is not deleted
- action is reversible for the current month

Include confirmation must say:

- payment counts in the month again
- balance is unchanged

Paid-off confirmation must say:

- lifecycle changes to `Betald · Avslutad`
- future planned payments stop
- if backend sets balance to zero, that is an explicit balance update
- it does not record an actual bank payment

Archive confirmation must say:

- debt is hidden from normal planning
- history is kept
- restore is available only if backend permits it

Remove confirmation:

- only for backend-permitted safe remove
- destructive styling only here or where backend marks action destructive

## Validation Rules

- actions are rendered/enabled only from PR 5 permissions
- closed/skipped months expose no lifecycle affordances
- action success refetches debt editor and dashboard data
- optimistic UI must not invent lifecycle/participation state unless response is
  authoritative
- errors from backend show as action-level feedback

## Audit / History Behavior

No frontend-generated history. The UI may show recent event rows only if PR 5
returns real events.

## Dashboard / Month-Close / Recap Impact

- skip/include must refresh dashboard equation
- paid/archive/restore must refresh future/materialized views when relevant
- current month payment total must follow backend read model after action
- balance snapshot must not change after skip/include

## Acceptance Criteria

- Lifecycle actions call backend endpoints.
- Confirmations use financially honest Swedish copy.
- Actions are shown only when backend permits them.
- Groups update from backend data after mutation.
- Dashboard totals refresh after skip/re-include.
- Closed/skipped months remain read-only.

## Tests To Add

- action menu renders correct actions per lifecycle/participation
- disabled reason maps to visible copy
- skip confirmation contains balance-still-owed copy
- include confirmation contains balance-unchanged copy
- paid confirmation does not claim actual payment was recorded
- archive confirmation states hidden, not deleted
- successful action invalidates debt/dashboard queries
- backend error is shown and local state is not changed
- read-only month hides lifecycle actions

## Validation

```bash
cd Frontend
npx vitest run src/Pages/private/debts src/utils/i18n/pages/private/debts
npm run build
```

## Explicit Non-Goals

- No balance update UI.
- No progress/history UI.
- No backend changes.
- No local fake lifecycle state.
