# PR 6 — Debt Target Page Shell

| | |
| --- | --- |
| **Type** | Frontend UI shell |
| **Depends on** | PR 5 |
| **Blocks** | PR 7-10 |
| **Risk** | Medium — UI must not conflate payment, balance, and lifecycle |

## Purpose

Build the target Debt editor page shell from the PR 5 read model. This PR is
display-only: hero, payment/balance strip, ledger groups, empty/read-only states,
and action slots. No mutating flows are wired.

Design reference:

- `explorations/debt/MVP-Debt v2.html`
- `explorations/debt/debt-editor-handover.md`
- `explorations/debt/MVP-Debt v1.html` as Stage-0 reference
- `explorations/income/MVP-Income v1.html` as sibling editor grammar

## Dependencies

- PR 5 endpoint returns real summary, rows, groups, action permissions, and
  disabled reasons.
- Existing shared editor primitives are inspected before adding new debt-only
  components.

## Frontend Scope

Build:

- `Skulder` page hero
- planned monthly payment as the lead hero number
- `Kvar att betala` as a separate balance snapshot
- remaining budget pill from backend/dashboard data
- payment/balance strip with two zones:
  - `Påverkar månaden`
  - `Ögonblicksbild`
- payment split bar by debt type when backend provides real totals
- ledger groups:
  - `Betalas denna månad`
  - `Ingår inte denna månad`
  - `Betald · Avslutad`
  - `Arkiverad`
- row layout with balance and planned payment as separate columns
- row kebab slots driven by PR 5 `Actions`
- empty state
- closed/skipped month read-only state

Do not wire:

- add debt submit
- edit details submit
- update balance submit
- skip/include/paid/archive/restore/remove submits
- progress modal with fabricated history

## Files / Areas Likely Touched

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/*`
- `Frontend/src/Pages/private/debts/types/*` if introduced
- `Frontend/src/Pages/private/debts/utils/*` if introduced
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/hooks/budget/editPeriod/monthEditorQueryKeys.ts`
- `Frontend/src/components/molecules/forms/budgetEditor/*`
- `Frontend/src/utils/i18n/pages/private/debts/*`
- `Frontend/src/routes/appRoutes.ts` only if route naming needs cleanup
- tests beside changed components/utils

## DTO / API Contract Used

Use PR 5 read model only. Required fields:

- `MonthStatus`
- `IsReadOnly`
- `Summary.IncludedMonthlyPaymentTotal`
- `Summary.ActiveLiabilityBalanceTotal`
- `Summary.RemainingAfterDebtPayments`
- row `SourceLifecycleStatus`
- row `ParticipationStatus`
- row `Balance`
- row `MonthlyPayment`
- row `SourceMonthlyPayment`
- row `Progress`
- row `Actions`
- row `DisabledReasons`

Frontend must not infer group membership from:

- `MonthlyPayment = 0`
- `Balance = 0`
- row name/type text
- local mock arrays

## UX Contract

- Hero leads with planned monthly payments.
- Balance is a separate snapshot and never part of remaining-money math.
- Ledger groups by lifecycle/participation, not type.
- Type is row meta/dot only.
- Rows show both `Kvar att betala` and `Planerad · per månad`.
- `Ändrad i {månad}` appears only when PR 5 provides a real comparison field.
- Progress bars appear only when PR 5 returns progress data.
- Closed/skipped months hide mutation affordances and show read-only copy.
- Copy uses i18n dictionaries, not inline hardcoded strings.

## Validation Rules

- no enabled mutating buttons without a real backend action contract
- disabled actions use PR 5 reason codes
- page handles loading, no open month, empty debts, normal month, and read-only
  month
- mobile row layout labels both money values clearly
- no nested cards inside cards; follow shared money-flow editor shell

## Audit / History Behavior

None. This PR reads data only.

## Dashboard / Month-Close / Recap Impact

None directly. The displayed payment total must equal dashboard debt payment
total for the selected month. Balance display must be visibly separate.

## Acceptance Criteria

- Page renders entirely from PR 5 data.
- Hero, strip, ledger groups, rows, empty state, and read-only state match the
  target design direction.
- No fake progress/history/changed/paid/skipped/archived state exists.
- Action menus are present only as allowed/disabled by backend permissions.
- Swedish copy uses approved neutral terms.
- Desktop and mobile layouts keep text and money values readable.

## Tests To Add

- summary renderer keeps payment and balance in separate zones
- group builder maps lifecycle/participation to the four target groups
- zero payment does not imply skipped
- zero balance does not imply paid-off
- read-only month hides add/action affordances
- progress hidden when row progress is null
- changed pill hidden when comparison field is absent
- i18n smoke for approved Debt terms

## Validation

```bash
cd Frontend
npx vitest run src/Pages/private/debts src/utils/i18n/pages/private/debts
npm run build
```

## Explicit Non-Goals

- No frontend mutations.
- No optimistic lifecycle state changes.
- No local fake repayment history.
- No backend changes.
