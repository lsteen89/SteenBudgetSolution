# Debt Polish Implementation Handoff

Date: 2026-06-03

## Recommended PR Order

1. `01-pr-debt-payment-truth.md`
   - Land backend-owned monthly payment breakdown first.
   - This removes ambiguity and prevents frontend-only fake math.

2. `02-pr-debt-form-language-and-preview.md`
   - Use PR 1 formula/DTO as the source of truth.
   - Add dirty previews and precise Swedish labels.

3. `03-pr-debt-ux-parity-with-expenses.md`
   - Polish hierarchy, menu grouping, and page rhythm after the math contract is visible.

## Exact Files Likely To Touch

Backend:

- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorRowDto.cs`
- `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtEditorSummaryDto.cs`
- new `Backend/Application/DTO/Budget/Months/Editor/Debt/DebtMonthlyPaymentBreakdownDto.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/GetBudgetMonthDebtEditorQueryHandler.cs`
- optional new calculator under `Backend/Application/Services/Debts/`
- optional interface under `Backend/Application/Abstractions/Application/Services/Debts/`
- `Backend/Infrastructure/DependencyInjection.cs` if a service is introduced.

Frontend:

- `Frontend/src/types/budget/DebtEditorDto.ts`
- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerRow.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLedgerGroup.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsBalanceStrip.tsx`
- `Frontend/src/Pages/private/debts/components/DebtsSoulHero.tsx`
- `Frontend/src/Pages/private/debts/components/DebtCreateModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtDetailsModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtPlannedPaymentModal.tsx`
- `Frontend/src/Pages/private/debts/components/DebtLifecycleConfirmDialog.tsx`
- `Frontend/src/utils/i18n/pages/private/debts/DebtCreateModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtDetailsModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtPlannedPaymentModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/debts/DebtsEditorPage.i18n.ts`
- optional `Frontend/src/Pages/private/debts/utils/debtPaymentBreakdown.ts`
- optional `Frontend/src/components/molecules/forms/budgetEditor/BudgetEditorRowActionsMenu.tsx`

Tests:

- `tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/BudgetMonthDebtEditorReadModelTests.cs`
- new or existing backend unit tests for the payment breakdown calculator.
- `tests/Backend.UnitTests/Services/Budget/Projections/BudgetDashboardProjectorTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/BudgetMonthlyTotalsServiceTests.cs`
- `tests/Backend.UnitTests/Features/BudgetMonths/BudgetMonthCloseSnapshotServiceTests.cs`
- `Frontend/src/Pages/private/debts/components/*.test.tsx`
- optional debt E2E specs if existing flows cover these screens.

## Tests To Run

Backend focused:

```bash
dotnet test tests/Backend.UnitTests/Backend.UnitTests.csproj --filter "Debt|BudgetMonthlyTotalsService|BudgetMonthCloseSnapshotService|BudgetDashboardProjector"
dotnet test tests/Backend.IntegrationTests/Backend.IntegrationTests.csproj --filter "BudgetMonthDebtEditorReadModel|BudgetMonthDebtCreateAndEditDetails|BudgetMonthDebtBalanceAdjustment|BudgetMonthDebtLifecycleParticipation"
```

Frontend focused:

```bash
cd Frontend
npm test -- --run src/Pages/private/debts
npm run typecheck
```

Browser/E2E after UI polish:

```bash
./scripts/playwright-e2e.sh smoke
```

Use narrower E2E filters if the repo has debt-specific specs by then.

## Risks

- Frontend-only preview math will drift. Backend must own PR 1 formula.
- `DebtPaymentCalculator` is easy to misuse. It calculates suggested payment, not monthly split of a chosen payment.
- Existing progress UI is honest history. Do not repurpose it as monthly projection.
- Dashboard/month-close totals must continue subtracting stored included `MonthlyPayment`.
- Original amount is not reliably present. Do not label `FirstBalance` as original amount.
- Closed/skipped months must stay immutable.
- Budget-plan-only creates should not fake a current-month row.

## Things Not To Change

- Do not mutate balance when APR/fee/min/term/planned payment changes.
- Do not mutate planned payment when balance changes.
- Do not store projected balance as actual balance.
- Do not add actual payment ledger behavior.
- Do not fake progress/history.
- Do not change dashboard equation.
- Do not make min-payment warnings blocking unless PO explicitly changes the contract.
- Do not create migrations unless implementation proves the read-model formula needs persisted data.

## UX Copy Recommendations

Swedish labels:

- `Årsränta (%)`
- `Avgift per månad`
- `Planerad månadsbetalning`
- `Kvar att betala`
- `Minskar skulden`
- `Efter månaden`
- `Saldo påverkas inte här`
- `Betalningen täcker inte ränta och avgift. Saldot väntas inte minska denna månad.`
- `Ingår inte denna månad`
- `Betald`
- `Avslutad`
- `Arkiverad`

Action menu group order:

1. Planning: `Redigera planerad betalning`, `Redigera uppgifter`, `Uppdatera saldo`
2. Insight: `Visa återbetalningsförlopp`
3. This month: `Hoppa över denna månad`, `Inkludera denna månad`
4. Lifecycle: `Markera som betald`, `Arkivera`, `Återställ skuld`
5. Destructive: `Ta bort`

## Open Questions For PO

- Should minimum payment warnings be added in PR 1 or PR 2, and should they be advisory only? Recommendation: advisory amber only.
- Should term months remain metadata, or should a future PR add payoff schedule/projection? Recommendation: keep out of this polish set.
- Should Debt strip prioritize payment breakdown over type distribution? Recommendation: yes, make interest/fee/principal primary and type split secondary or remove if crowded.
- Should `Visa återbetalningsförlopp` stay hidden when no history exists, or appear disabled with an explanation? Recommendation: keep hidden to avoid fake history.
- Should action menu grouping be a shared primitive enhancement or a Debt-local wrapper? Recommendation: shared only if it preserves Expense behavior without changes.

