# PR 9 — Debt Balance Update And Progress UI

| | |
| --- | --- |
| **Type** | Frontend behavior/UI |
| **Depends on** | PR 3 + PR 5 + PR 6 |
| **Blocks** | PR 10 |
| **Risk** | High — balance changes are financial corrections, not payment edits |

## Purpose

Wire `Uppdatera saldo` and display repayment progress/history from real backend
data. This PR is the only frontend PR allowed to change balance by hand.

## Dependencies

- PR 3 balance adjustment endpoint and structured history exist.
- PR 5 read model exposes progress/history and balance-update permissions.
- PR 6 shell exists.

## Frontend Scope

Wire:

- `Uppdatera saldo` drawer/modal
- new balance input
- optional note field if backend supports it
- scope selector where backend supports scoped balance updates
- success/error handling
- query invalidation for debt editor and dashboard data
- repayment progress display from PR 5 `Progress`
- recent balance/history view from PR 5 `RecentEvents` if available

Do not:

- record actual payments
- reduce balance from planned payment edit
- infer paid-off from zero balance
- synthesize history/progress from current balance and original balance unless
  backend explicitly returns those values as progress data

## Files / Areas Likely Touched

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtBalanceModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtProgressModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerSection.tsx`
- `Frontend/src/Pages/private/debts/utils/*`
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/utils/i18n/pages/private/debts/*`
- tests beside changed components/utils

## DTO / API Contracts Used

Balance update:

```text
POST /api/budgets/months/{yearMonth}/debt-items/{monthDebtId}/balance-adjustments
```

Request:

```ts
{
  newBalance: number;
  scope: "currentMonthOnly" | "currentMonthAndBudgetPlan" | "budgetPlanOnly";
  note?: string | null;
}
```

Read model:

- row `Balance`
- row `SourceBalance`
- row `MonthlyPayment`
- row `Progress`
- row `Actions.CanUpdateBalance`
- `RecentEvents`

## UX Contract

Use calm, practical copy:

- `Uppdatera saldo`
- `Nytt saldo`
- `Saldohistorik`
- `Planerad månadsbetalning påverkas inte`
- `Det här rör inte din planerade betalning`

Rules:

- balance modal shows current planned payment as read-only context
- balance modal says this is a correction/snapshot update, not a judgment
- progress is hidden or shown as an honest no-history state when backend returns
  null/empty progress
- a lower balance is not celebrated
- zero balance does not trigger paid-off UI; paid-off remains PR 8 lifecycle

## Validation Rules

- new balance must be non-negative
- invalid input cannot submit
- backend validation errors render
- month-only rows cannot select plan scopes
- closed/skipped months hide balance update actions
- success refetches PR 5 read model
- planned payment displayed after update remains unchanged unless backend says
  otherwise, which should fail tests

## Audit / History Behavior

Frontend displays only backend-returned history. It does not create audit rows or
fake timeline events.

## Dashboard / Month-Close / Recap Impact

- payment totals and remaining-money equation do not change after balance update
- liability balance snapshot changes after refetch
- progress/history updates only from backend data
- recap later separates balance delta from payment delta

## Acceptance Criteria

- Balance update calls PR 3 endpoint.
- Planned payment remains visually and technically separate.
- Balance update success refreshes row balance and summary balance.
- Progress/history renders only from PR 5 data.
- Paid-off action remains lifecycle UI from PR 8.
- Closed/skipped months expose no balance update affordance.

## Tests To Add

- balance modal renders current balance and planned payment separately
- submit sends new balance, scope, and note
- month-only row disables plan scopes
- successful balance update invalidates/refetches debt editor
- planned payment does not change after mocked success
- progress hidden when null
- progress renders from backend progress data
- zero balance does not show paid-off group unless lifecycle says paidOff
- read-only month hides balance update action

## Validation

```bash
cd Frontend
npx vitest run src/Pages/private/debts src/utils/i18n/pages/private/debts
npm run build
```

## Explicit Non-Goals

- No actual payment ledger.
- No paid-off/archive/restore/skip wiring.
- No backend changes.
- No fake history.
