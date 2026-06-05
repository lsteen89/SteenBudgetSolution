# Debt Polish Investigation

Date: 2026-06-03

Scope: post-implementation investigation of the Debt dashboard/editor. This pass inspected frontend, backend, SQL, dashboard totals, close-month totals, and tests. No production implementation belongs in this document set.

## Current Behavior Summary

Debt currently separates the two important stored values correctly:

- `Balance` / `Kvar att betala` is the liability snapshot.
- `MonthlyPayment` / `Planerad månadsbetalning` is the planned monthly cash outflow.

Editing debt details (`name`, `type`, `Apr`, `MonthlyFee`, `MinPayment`, `TermMonths`, `MonthlyPayment`) intentionally does not mutate `Balance`. Updating balance is a separate audited command. Skipping a debt removes the payment from the month total without zeroing the planned payment. Paid and archived debts are excluded from active monthly totals.

The broken part is visibility of derived monthly debt truth. The UI can show that APR and fee changed, for example:

```text
Avbetalning · ränta 12,99 % · avgift 150 kr/mån
```

but it does not show the monthly consequence of that change:

```text
monthlyInterest = currentBalance * annualInterestPercent / 100 / 12
monthlyFee = configured monthly fee
principalPayment = max(plannedMonthlyPayment - monthlyInterest - monthlyFee, 0)
projectedBalanceAfterMonth = max(currentBalance - principalPayment, 0)
```

The existing progress bar is not this. It is strict audited balance-event progress from `DebtBalanceEvent`. That is good, but it means a debt with no balance events has no repayment progress, and a debt with changed APR/fee has no monthly breakdown.

## Backend Data Flow

Primary read path:

- `GET /api/budgets/months/{yearMonth}/debt-editor`
- `Backend/Application/Features/Budgets/Months/Editor/Debts/GetDebtEditor/GetBudgetMonthDebtEditorQueryHandler.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Debts/BudgetMonthDebtMutationRepository.Sql.cs`
- DTOs under `Backend/Application/DTO/Budget/Months/Editor/Debt/`

The handler loads month/source rows, resolves group/actions, builds balance-event progress, and totals:

- `IncludedMonthlyPaymentTotal`: sum of `MonthlyPayment` for active/included rows.
- `NotIncludedMonthlyPaymentTotal`: sum of skipped rows' stored `MonthlyPayment`.
- `ActiveLiabilityBalanceTotal`: sum of balances for active + skipped rows.
- `PaidOffBalanceTotal`: sum paid group balances.
- `ArchivedBalanceTotal`: sum archived group balances.

Dashboard/close-month flow:

- `Backend/Infrastructure/Repositories/Budget/BudgetDashboard/BudgetMonthDashboardRepository.sql.cs`
- `Backend/Application/Services/Budget/Projections/BudgetDashboardProjector.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthlyTotalsService.cs`
- `Backend/Application/Services/Budget/Compute/BudgetMonthCloseSnapshotService.cs`

Dashboard and close-month use `MonthlyPayment` as the debt term in:

```text
income + carryOver - expenses - savings - includedDebtPayments = remaining
```

That should remain true. Interest/fee/principal breakdown is explanatory and planning detail; it must not replace the cash outflow term.

Balance mutation path:

- `AdjustBudgetMonthDebtBalanceCommandHandler`
- Updates `Balance` only.
- Writes structured `DebtBalanceEvent`.
- Does not touch `MonthlyPayment`.
- Does not mark paid automatically.

Detail mutation path:

- `PatchBudgetMonthDebtDetailsCommandHandler`
- Updates `Apr`, `MonthlyFee`, `MinPayment`, `TermMonths`, `MonthlyPayment`, and metadata.
- Does not touch `Balance`.
- Audits changed fields in `BudgetMonthChangeEvent`.

Create path:

- `CreateBudgetMonthDebtCommandHandler`
- Creates month row and/or source row based on scope.
- Requires caller-provided `MonthlyPayment`.
- Does not currently expose a created-row monthly breakdown in the target editor DTO.

Existing payment calculator:

- `Backend/Application/Services/Debts/DebtPaymentCalculator.cs`
- Calculates a suggested monthly payment from debt type, balance, APR, fee, min payment, and term.
- It is not the same as the required monthly payment breakdown. It answers “what payment should be seeded?” not “how does the chosen payment split into interest, fee, and principal this month?”

## Frontend Data Flow

Debt page:

- `Frontend/src/Pages/private/debts/DebtsEditorPage.tsx`
- Reads `useBudgetMonthDebtEditor(yearMonth)` and dashboard month data.
- Uses `editorData.summary`, grouped rows, and active rows.
- Mutations invalidate debt editor/dashboard state through `useMonthEditor.ts`.

Debt display:

- `DebtLedgerRow.tsx`
  - shows `row.balance` as `Kvar att betala`.
  - shows `row.monthlyPayment` as active planned payment.
  - shows APR/monthly fee/min payment in meta text.
  - shows progress only from `row.progress`.
- `DebtsBalanceStrip.tsx`
  - shows total monthly payments and active liability balance.
  - meter is split by debt type and stored `monthlyPayment`.
- `DebtsSoulHero.tsx`
  - leads with included monthly payments and snapshot balance.

Debt forms:

- `DebtCreateModal.tsx`
- `DebtDetailsModal.tsx`
- `DebtPlannedPaymentModal.tsx`
- `DebtBalanceModal.tsx`

Create/details/payment forms submit stored fields. They do not render a backend-aligned dirty preview for monthly interest, fee, principal, or projected balance. `DebtBalanceModal` is clearer than the others because it explicitly says planned payment is unchanged.

Expense anchor:

- `ExpenseItemModal.tsx` uses `BudgetEntryModalShell`, `EditorPreviewCard`, scope cards, dirty preview logic, and calm labels.
- `ExpenseLedgerRow.tsx` keeps row hierarchy quiet: name/category/status left, money/actions right.
- `ExpenseRowActionsMenu.tsx` has few actions and only separates destructive delete.

## Where Debt Math Is Calculated Today

Calculated today:

- Dashboard remaining money subtracts stored included `MonthlyPayment`.
- Editor summary sums stored `MonthlyPayment` and stored `Balance`.
- Balance progress computes from real `DebtBalanceEvent` old/new balances.
- `DebtPaymentCalculator` calculates suggested/seeding payment, not the monthly split of an existing planned payment.

Missing today:

- `MonthlyInterest`
- `MonthlyFeeAmount` normalized to zero when null
- `PrincipalPayment`
- `ProjectedBalanceAfterMonth`
- `PaymentCoversInterestAndFees`
- `InterestAndFeeShortfall`
- Summary totals for projected principal reduction, interest, fees, and after-month balance.

Duplicated/risky today:

- Frontend formats APR/fee/payment/balance in several places, but does not calculate derived debt payment truth.
- If PR 2 adds preview math only in frontend without a backend-owned formula, it will drift from the read model. Backend must own the formula; frontend dirty previews may mirror it only through a tested shared helper with the same examples.

## Bugs Found

1. APR/fee edits update row text but not any visible monthly effect.
   - Example: 93 000 kr balance, 1 550 kr payment, 10.99% APR, 130 kr fee gives about 568.27 kr principal.
   - Changing to 12.99% APR and 149.99 kr fee gives about 393.28 kr principal.
   - Current UI still centers `93 000 kr kvar`, `11 % minskat`, and `Kvar att betala 93 000 kr`, so the consequence is hidden.

2. Existing progress bar can be mistaken for monthly repayment projection.
   - It is actually balance-event history.
   - It must remain strict and not be faked, but the UI needs a separate monthly breakdown.

3. Planned payment changes affect dashboard/month totals but do not show whether payment covers interest + fee.
   - A payment below interest + fee currently looks like an ordinary planned outflow.
   - The user should see an amber advisory: principal is 0 kr and balance is not projected to decrease this month.

4. Balance updates correctly change liability, but there is no visible recomputation of monthly interest.
   - Monthly interest depends on current balance. After balance adjustment, the breakdown must change even if planned payment/APR/fee do not.

5. Minimum payment changes are stored/validated but not used in a visible monthly consequence.
   - It is only meta today. If planned payment is below min payment, the UI should warn if product decides that min payment is advisory. Do not block unless backend contract changes.

6. Term changes are stored and used by `DebtPaymentCalculator` for seeded/suggested payment, but the editor does not show any term-based projection.
   - Do not invent payoff schedule in the frontend. Document product decision before adding term-derived projections.

7. Current-month-only and budget-plan-only behavior is technically separated, but the UI preview does not make the post-save surface obvious enough for debt.
   - Expenses already has stronger plan-aware preview grammar.

## UX Mismatches Found

- Debt modals use the shared modal shell, but Debt create/details/payment lack Expense-style preview cards.
- Debt labels are less precise:
  - `Ränta` should be `Årsränta (%)`.
  - `Månadsavgift` should be `Avgift per månad`.
  - `Löptid` should indicate months.
- Debt row meta says `ränta` and `avgift` but gives no payment breakdown. This is especially misleading because those fields materially change the principal portion of payment.
- Debt row has two strong money columns plus progress. It is denser and more domain-specific than Expense, but the hierarchy needs a clearer distinction between:
  - monthly cash outflow
  - current liability
  - projected principal reduction
  - historical progress
- The Debt action menu is too flat with too many actions:
  - `Redigera planerad betalning`
  - `Uppdatera saldo`
  - `Visa återbetalningsförlopp`
  - `Redigera uppgifter`
  - `Hoppa över denna månad`
  - `Markera som betald`
  - `Arkivera`
- Shared `BudgetEditorRowActionsMenu` only inserts a separator before danger actions. Debt needs grouping even when no action is technically destructive.
- Debt balance strip meter is split by type. Product direction says ledger groups by lifecycle/participation, type as row meta. A type split can stay if useful, but the more important missing semantic is payment breakdown: interest, fees, principal.
- Swedish copy is mostly calm, but `Betald · Avslutad` and action labels need consistency with lifecycle terms: `Betald`, `Avslutad`, `Arkiverad`.

## State Trace Notes

- Current balance / `Kvar att betala`: stored as `BudgetMonthDebt.Balance`; source pair in `Debt.Balance`; changes only through balance adjustment or paid-off-with-zero option.
- Original amount: not a first-class field in the current editor DTO. Existing progress uses earliest `DebtBalanceEvent.OldBalance` as `FirstBalance`, which is not original amount unless history starts at original amount.
- Planned monthly payment: stored as `MonthlyPayment`; included in dashboard/month-close only when participation is `included` and source lifecycle active.
- Interest rate: stored as `Apr`; currently displayed as meta text only in editor.
- Monthly fee: stored as nullable `MonthlyFee`; currently displayed as meta text only.
- Minimum payment: stored as nullable `MinPayment`; validation requires it for revolving debt; currently displayed as meta text only.
- Term: stored as nullable `TermMonths`; required for installment/bank loan; used by `DebtPaymentCalculator` for payment suggestion/seeding, not by editor projection.
- Hero totals: use summary included payment and active liability balance.
- Row display: shows balance, active planned payment, meta, optional audited progress.
- Group totals: active/skipped/paid/archived summary from backend groups.
- Distribution bar: active rows split by debt type and stored `monthlyPayment`.
- Skipped month behavior: row moves to skipped; monthly payment excluded from included total; balance stays in active liability.
- Paid/completed behavior: source lifecycle becomes `paidOff`; row moves paid; payment excluded; optional set-balance-zero writes balance events.
- Archived behavior: source lifecycle archived; row moves archived; payment and active liability excluded.
- Current-month-only debt: no source fields; cannot write plan scopes; can be removed when permitted.
- Future-plan debt: `budgetPlanOnly` create writes source but no current month row, so current editor should not fake a row.
- Closed/skipped months: read-only; action flags disabled; write commands reject.

## Risks / Unknowns

- Product must decide whether the monthly formula is only explanatory or also stored/audited. Recommendation: read-model derived only for now; no migration.
- Product must decide whether minimum payment warnings are required and whether they are advisory or blocking. Recommendation: advisory amber only.
- Product must decide whether term should drive a payoff projection. Recommendation: out of scope for this polish set unless a backend contract is defined.
- “Original amount” is not reliably available from current data. Do not label `FirstBalance` as original amount.
- Frontend dirty preview requires local calculation before save. That is acceptable only if it is small, tested against backend examples, and clearly mirrors the backend formula.

## Recommended PR Split

1. `01-pr-debt-payment-truth.md`
   - Backend-owned monthly breakdown DTO and summary fields.
   - Frontend displays breakdown and warnings.
   - Proves APR/fee/payment/balance changes affect derived math without mutating balance.

2. `02-pr-debt-form-language-and-preview.md`
   - Swedish label cleanup.
   - Add Expense-style preview cards to create/details/payment forms.
   - Dirty preview mirrors backend formula.

3. `03-pr-debt-ux-parity-with-expenses.md`
   - Modal rhythm, row hierarchy, grouped action menu, scope/preview/bar/status polish.
   - No new financial math beyond PR 1.

