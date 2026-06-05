# PR 1 — Debt Payment Truth

## Problem

Debt stores the correct values, but the editor does not expose the monthly truth of a planned payment. APR and fee edits change row meta text, while the user still sees mostly unchanged balance/progress surfaces.

This is misleading. `Kvar att betala` can stay unchanged after an APR/fee edit, but the monthly breakdown changes materially.

## Product Contract

Backend owns this formula for each visible debt row:

```text
monthlyInterest = currentBalance * annualInterestPercent / 100 / 12
monthlyFee = configured monthly fee, null treated as 0
principalPayment = max(plannedMonthlyPayment - monthlyInterest - monthlyFee, 0)
projectedBalanceAfterMonth = max(currentBalance - principalPayment, 0)
```

Rules:

- Planned monthly payment is the cash outflow used by dashboard/month-close totals.
- Interest and fee consume part of that payment.
- Only the principal portion reduces projected debt balance.
- Editing APR or fee must not mutate stored balance.
- Updating balance must recompute monthly interest because interest depends on current balance.
- Progress/history remains based only on real `DebtBalanceEvent` data.
- Warning when planned payment does not cover interest + fee is advisory amber, not blocking/red.

## Technical Scope

Add a backend read-model calculation for monthly payment breakdown.

Likely new DTO:

```csharp
public sealed record DebtMonthlyPaymentBreakdownDto(
    decimal PlannedMonthlyPayment,
    decimal MonthlyInterest,
    decimal MonthlyFee,
    decimal PrincipalPayment,
    decimal ProjectedBalanceAfterMonth,
    bool CoversInterestAndFees,
    decimal InterestAndFeeShortfall);
```

Add to `DebtEditorRowDto` as `PaymentBreakdown`.

Consider summary fields:

- `IncludedMonthlyInterestTotal`
- `IncludedMonthlyFeeTotal`
- `IncludedPrincipalPaymentTotal`
- `ProjectedActiveLiabilityBalanceAfterMonth`
- `RowsBelowInterestAndFeesCount`

Keep dashboard equation unchanged:

```text
income + carryOver - expenses - savings - includedDebtPayments = remaining
```

`includedDebtPayments` remains sum of stored `MonthlyPayment`, not principal.

## Backend Scope

Likely files:

- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorRowDto.cs`
- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorSummaryDto.cs`
- new DTO file under `Backend/Application/DTO/Budget/Months/Editor/Debt/`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/GetBudgetMonthDebtEditorQueryHandler.cs`
- optional new service under `Backend/Application/Services/Debts/`
- optional interface under `Backend/Application/Abstractions/Application/Services/Debts/`
- `Backend/Infrastructure/DependencyInjection.cs` if a service is introduced
- `Frontend/src/types/budget/DebtEditorDto.ts`

Do not use `DebtPaymentCalculator` for this directly. It calculates suggested payment from debt terms. This PR needs a breakdown of an already-selected planned payment.

Rounding recommendation:

- Use `decimal`.
- Round displayed DTO money to 2 decimals using `MidpointRounding.AwayFromZero`.
- Frontend can display whole kronor where current page grammar does, but tests should assert DTO values at 2 decimals.

## Frontend Scope

Likely files:

- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx` if summary copy changes.
- `Frontend/src/utils/i18n/pages/private/debts/DebtsEditorPage.i18n.ts`
- tests for row/strip/hero.

Required UI:

- Show payment split for active rows:
  - `Ränta`
  - `Avgift`
  - `Minskar skulden`
  - optional `Efter månaden`
- Show amber advisory when `principalPayment = 0`:
  - Suggested Swedish copy: `Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.`
- Keep `Kvar att betala` as current balance, not projected balance.
- Keep progress/history visually distinct from monthly projection.

## Tests Required

Backend:

- Unit tests for new calculator/service:
  - zero APR and zero fee.
  - null fee treated as 0.
  - APR + fee examples from PO:
    - 93 000, 10.99%, 130, 1 550 -> interest 851.73, principal 568.27, projected 92 431.73.
    - 93 000, 12.99%, 149.99, 1 550 -> interest 1006.73, principal 393.28, projected 92 606.72.
  - payment less than interest + fee -> principal 0 and shortfall > 0.
  - balance 0 -> interest 0 and projected 0.
- Integration tests for `GetBudgetMonthDebtEditorQueryHandler`:
  - active row includes breakdown.
  - skipped row can include breakdown but does not contribute to included summary totals.
  - paid/archived rows do not contribute to active included breakdown totals.
  - changing APR/fee changes breakdown and not balance.
  - balance adjustment changes breakdown interest and not monthly payment.
- Regression tests that dashboard and close-month totals still use stored `MonthlyPayment`.

Frontend:

- Row renders monthly split separately from balance/progress.
- Amber advisory appears when payment does not cover interest + fee.
- Progress remains hidden when `progress` is null.
- Strip summary renders included principal/interest/fee totals from backend DTO.

## Acceptance Criteria

- APR/fee changes alter backend `paymentBreakdown` values on the next editor read.
- APR/fee changes do not alter `Balance` or create `DebtBalanceEvent`.
- Balance update alters `MonthlyInterest` and projected balance on the next editor read.
- Dashboard remaining money and close-month totals remain based on included `MonthlyPayment`.
- UI distinguishes:
  - current balance
  - planned payment
  - interest/fee/principal split
  - audited repayment progress
- Payment below interest + fee is visible as an amber advisory.

## Out of Scope

- No DB migration unless implementation proves a persisted field is necessary.
- No actual payment ledger.
- No automatic balance mutation from monthly projection.
- No payoff schedule from term months.
- No fake original amount.
- No redesign of all Debt UI beyond the required breakdown surfaces.

