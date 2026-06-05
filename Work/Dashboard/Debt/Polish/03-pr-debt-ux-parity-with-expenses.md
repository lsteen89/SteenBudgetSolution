# PR 3 — Debt UX Parity With Expenses

## Problem

Debt uses some shared money-flow primitives, but the page still feels more complex and less coherent than Expenses. The biggest mismatch is not visual style; it is hierarchy. Debt has more domain concepts, so the UI needs clearer grouping, calmer actions, and consistent preview/status rhythm.

## Product Contract

Debt should feel like the same product as Expenses, while preserving Debt-specific rules:

- Debt is not an expense.
- Planned payment affects monthly cash flow.
- Balance is a liability snapshot.
- Lifecycle/participation is separate from payment and balance.
- Do not fake progress/history.
- Do not moralize debt copy.

## Frontend Scope

Likely files:

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerGroup.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsEditorEmptyState.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLifecycleConfirmDialog.tsx`
- `Frontend/src/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu.tsx` if grouped menu support is needed.
- `Frontend/src/utils/i18n/pages/private/debts/DebtsEditorPage.i18n.ts`
- relevant component tests.

### Modal Rhythm

Align Debt modal flow with Expense:

- same header rhythm through `BudgetEntryModalShell`.
- same footer button order and disabled saving state.
- same scope-card placement.
- same preview-card placement once PR 2 exists.
- same discard behavior where forms can be dirty.

### Row Hierarchy

Recommended row hierarchy:

- Primary left: name.
- Secondary left: type + APR + fee + min payment.
- Status line only for exceptions:
  - `Bara {månad}`
  - `Ändrad mot planen`
  - `Ingår inte i {månad}`
  - `Betald`
  - `Arkiverad`
- Right side:
  - `Planerad månadsbetalning`
  - `Kvar att betala`
  - optional `Minskar skulden` once PR 1 is available.

Do not make audited progress compete with monthly projection. Progress is history, not this month's projection.

### Action Menu Recommendation

Keep one kebab for now, but group actions with separators. Do not split into many visible row buttons unless PO explicitly wants a noisier row.

Recommended groups:

1. Planning
   - `Redigera planerad betalning`
   - `Redigera uppgifter`
   - `Uppdatera saldo`

2. Insight
   - `Visa återbetalningsförlopp`

3. This month
   - `Hoppa över denna månad`
   - `Inkludera denna månad`

4. Lifecycle
   - `Markera som betald`
   - `Arkivera`
   - `Återställ skuld`

5. Destructive
   - `Ta bort`

Implementation note: current `BudgetEditorRowActionsMenu` only inserts a separator before `tone: danger`. Add optional grouping support to the shared primitive only if it does not disturb Expense behavior. Otherwise create a Debt-local grouped menu wrapper.

### Bar / Legend Semantics

Current Debt strip meter splits active payments by debt type. That is acceptable as secondary information, but PR 1 payment truth should become more prominent:

- `Ränta`
- `Avgift`
- `Minskar skulden`

Type should remain row meta, not the main grouping model.

### Empty / Loading / Error States

Align with Expense tone:

- Empty state should invite `Lägg till skuld` without explaining the whole product.
- Loading/error copy should be short.
- Read-only closed/skipped month copy should stay factual.

## Backend Scope

No backend changes expected if PR 1 is already in place.

Only revisit backend if:

- row status requires a new backend-owned reason code.
- action grouping needs stable action categories from the backend.

Recommendation: keep grouping frontend-only for now because action permissions are already backend-owned.

## Tests Required

Frontend:

- `DebtLedgerRow.test.tsx`
  - action menu order and separators/groups.
  - status lines only appear for meaningful exceptions.
  - active rows display payment/balance/projection hierarchy.
- `DebtLedgerGroup.test.tsx`
  - group labels and totals remain lifecycle/participation based.
- `DebtsBalanceStrip.test.tsx`
  - legend semantics do not imply balance is part of monthly remaining equation.
- modal tests:
  - Debt modal header/footer rhythm stays consistent.
- visual/browser E2E after implementation:
  - add/edit/skip/paid/archive flows still discoverable.

## Acceptance Criteria

- Debt rows feel like the same editor family as Expense without copying Expense domain behavior blindly.
- Action menu is grouped and scan-friendly.
- Destructive action remains separated.
- Status copy is calm and Swedish.
- Type is row metadata, not the primary ledger grouping.
- No frontend-only fake progress, original amount, history, or paid-off math.

## Out of Scope

- No backend financial formula work; PR 1 owns it.
- No form preview work; PR 2 owns it.
- No new lifecycle commands.
- No dashboard equation changes.
- No broad redesign of global budget editor primitives unless a tiny compatible extension is needed.

