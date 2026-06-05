# PR 2 — Debt Form Language And Preview

## Problem

Debt create/edit/payment forms submit important fields but do not preview the financial consequence. Labels are also too vague for debt:

- `Ränta` does not say annual percentage.
- `Månadsavgift` is less clear than `Avgift per månad`.
- `Löptid` does not make the unit obvious enough.

Expense forms already set the product rhythm: scope cards, preview card, calm helper text, and honest plan/current-month preview. Debt needs the same quality, but with debt-specific math.

## Product Contract

Form copy must make these distinctions visible:

- `Kvar att betala` is the current balance.
- `Årsränta (%)` and `Avgift per månad` affect the monthly breakdown.
- `Planerad månadsbetalning` affects monthly budget outflow.
- Balance is not changed by editing APR, fee, term, min payment, or planned payment.

Dirty previews may calculate locally before save, but must match PR 1 backend formula exactly.

## Frontend Scope

Likely files:

- `Frontend/src/Pages/private/debts/components/DebtCreateModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtDetailsModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtPlannedPaymentModal.tsx`
- `Frontend/src/utils/i18n/pages/private/debts/DebtCreateModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtDetailsModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtPlannedPaymentModal.i18n.ts`
- optional helper under `Frontend/src/Pages/private/debts/utils/`
- modal tests.

Required copy changes:

- `Ränta` -> `Årsränta (%)`
- `Månadsavgift` -> `Avgift per månad`
- `Löptid` -> `Löptid (månader)` or keep label `Löptid` with visible suffix `månader`
- Keep `Planerad månadsbetalning`
- Use `Saldo påverkas inte här` in helper text or preview note.

Required preview behavior:

- Add Expense-style `EditorPreviewCard` or Debt-specific preview card to create/details/payment forms.
- Preview shows at minimum:
  - planned monthly payment
  - monthly interest
  - monthly fee
  - estimated principal reduction
  - projected balance after this month
- In edit mode, scope-aware preview must show what changes in:
  - current month
  - budget plan
  - both
- In `budgetPlanOnly`, current month preview must remain unchanged.
- For month-only rows, plan scope must stay disabled and copy must say why.
- Show amber advisory when payment does not cover interest + fee.

## Backend Scope

No new backend behavior should be required if PR 1 lands first.

Backend involvement is limited to:

- consuming `paymentBreakdown` values from PR 1 for initial preview baseline.
- keeping DTO types in sync if the preview uses backend-provided values.

Do not add mutation behavior here.

## Tests Required

Frontend:

- `DebtCreateModal.test.tsx`
  - labels use `Årsränta (%)` and `Avgift per månad`.
  - preview updates when APR changes.
  - preview updates when monthly fee changes.
  - warning appears when payment does not cover interest + fee.
- `DebtDetailsModal.test.tsx`
  - balance facts remain read-only.
  - plan-only scope keeps current month preview unchanged.
  - both-scope preview changes both surfaces.
  - month-only row disables plan scopes.
- `DebtPlannedPaymentModal.test.tsx`
  - preview changes when planned payment changes.
  - copy says balance is unaffected.

Backend:

- None unless implementation introduces a shared contract helper or DTO change beyond PR 1.

## Acceptance Criteria

- Users can see before saving that APR/fee/payment changes affect monthly interest, fees, and principal.
- Labels are precise in Swedish.
- Preview math matches PR 1 backend examples.
- Forms do not imply balance changes when APR/fee/payment changes.
- Preview never invents actual payment history or progress.

## Out of Scope

- No new endpoints.
- No DB migration.
- No automatic payment suggestion logic.
- No payoff schedule.
- No action menu redesign.
- No changes to Expense behavior.

