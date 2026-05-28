# Savings MVP — implementation report

**Date:** 2026-05-22
**Branch:** `feature/PolishDashboardEditor`
**Surface:** `Frontend/src/Pages/private/savings/` (the signed-in Savings editor)
**Design source:** `explorations/savings/MVP-Savings.html` + `MVP-Review.html`
(Claude Design handoff bundle)

This report covers the frontend MVP build only. Several modules are
intentionally shipped as **frontend placeholders** with no backend wiring —
that was the agreed scope. The sections below say exactly which numbers are
real, which are session-local, and what the backend needs to provide next.

---

## 1. What was built

The Savings page now reads top-to-bottom as **habit → goals → month room →
plan ahead**, matching the MVP design:

| Module | File | Status |
| --- | --- | --- |
| Hero — base + goals split, funded-% pill | `components/SavingsSoulHero.tsx` | **Live data** |
| Saving-methods strip | `components/SavingsMethodsStrip.tsx` | Live data (unchanged) |
| Bassparande row (NEW) | `components/SavingsBaseHabitRow.tsx` | **Display live · edit placeholder** |
| Bassparande adjust dialog (NEW) | `components/SavingsBaseHabitDialog.tsx` | **Placeholder — no BE endpoint** |
| Månadens utrymme — six-term balance strip | `components/SavingsPlanBalanceStrip.tsx` | **Live data** |
| Goal cards + planned marker | `components/SavingsGoalCard.tsx` | Live data (unchanged) |
| Lägg till sparmål — inline draft | `components/SavingsGoalDraftCard.tsx` | Live data (unchanged) |
| Justera mål dialog + contribution simulator | `components/SavingsGoalContributionModal.tsx` | **Edit live · simulator placeholder** |
| Forecast row (NEW) | `components/SavingsForecastRow.tsx` | **Placeholder — FE-derived projection** |
| Tidigare mål — collapsed | `components/SavingsOldGoalsSection.tsx` | Live data (unchanged) |

Page composition: `SavingsEditorPage.tsx`.
Copy: `utils/i18n/.../SavingsEditorPage.i18n.ts` and `SavingsGoalModal.i18n.ts`
(Swedish / English / Estonian).

---

## 2. The reconciliation fix (the reason this couldn't ship as-is)

The `MVP-Review` flagged a contract mismatch the old page silently inherited:
the hero summed **only goal contributions**, while the balance strip used the
dashboard's `totalSavings`, which is **only the base `Savings.MonthlySavings`**.
Same page, same idea of "monthly savings", two different numbers.

What the MVP now does:

- **One set of inputs.** `base` = `dashboard.savings.monthlySavings`
  (surfaced as `summary.habitSavings`); `goals` = the sum of the active
  goal-editor rows' `monthlyContribution`. The hero total (`base + goals`) and
  the balance strip both consume those same two numbers, so they cannot
  disagree.
- **Honest "Kvar".** The balance strip derives `Kvar` from the six terms it
  displays — `income + carry − expenses − base − goals − debts` — instead of
  the dashboard's `remainingToSpend`. The dashboard figure does **not** net out
  goal contributions, so using it directly would overstate what is left.
- **The total formula was NOT changed** (per `MVP-Review` §0.3).
  `TotalSavingsMonthly` on the backend is still base-only; the frontend does
  the display-time reconciliation. No projector / snapshot / monthly-totals
  behaviour was touched.

---

## 3. What works right now (real data, no backend changes needed)

- **Hero** — headline total, base-vs-goals split subtitle, funded-% pill
  (`Σ saved / Σ target`), and the ahead/behind insight pill. All from existing
  queries (`useBudgetMonthSavingsGoals`, `useBudgetDashboardMonthQuery`).
- **Bassparande row — display.** Shows the real base monthly savings amount
  (`dashboard.savings.monthlySavings`).
- **Six-term balance strip** — Inkomst, Utgifter, Bassparande, Målsparande,
  Skulder, Kvar. Each term has a real source; the breakdown visibly adds up.
- **Goal cards, draft create, methods strip + editor, goal lifecycle
  (complete / cancel / remove), Tidigare mål** — unchanged and already wired to
  their backend slices.
- **Justera mål — monthly amount + scope edit** — unchanged; still persists via
  `usePatchBudgetMonthSavingsGoal`.

---

## 4. What is a placeholder (needs backend before it is real)

### 4.1 Bassparande editor — NO backend endpoint exists

`SavingsBaseHabitDialog` is a fully built editor (amount field + the three
standard scopes: `currentMonthOnly` / `currentMonthAndBudgetPlan` /
`budgetPlanOnly`). On save it currently:

- logs the intended payload — `console.info("[savings-mvp] update Savings.MonthlySavings", { amountMonthly, scope })`;
- stores the new amount in **session-local state** (`baseMonthlyOverride` in
  `SavingsEditorPage.tsx`) so the hero, the Bassparande row and the balance
  strip all recompute live;
- the override is **not persisted** — it resets on month change / reload.

**Backend work required:** a command to update `Savings.MonthlySavings` for the
open month, honouring the three scopes the same way income / expense / debt /
savings-goal handlers already do. Per `MVP-Review` §0.2, watch the edge case:
when `SourceSavingsId IS NULL` (a month-only orphan with no baseline) the plan
scopes must be **rejected**, not silently create a baseline — the dialog should
then offer only `currentMonthOnly`. The frontend does **not** yet detect that
orphan state (see §6).

### 4.2 Forecast row — FE-derived projection

`SavingsForecastRow` projects six months of total goal savings: it starts from
`Σ amountSaved` and adds `Σ monthlyContribution` per month. It is a pure
frontend straight-line projection — there is **no backend forecast endpoint**.
It is honest as a "if the plan holds" illustration, but it ignores goal target
dates, goal completion, and base savings.

**Backend decision needed:** either accept the FE projection as the MVP
behaviour, or add a forecast endpoint that accounts for goals reaching their
targets and dropping out. Low urgency — the row hides itself when there is no
positive monthly plan.

### 4.3 Contribution simulator — pure FE what-if

Inside the Justera mål dialog, the simulator previews a one-off transfer:
`saved + testAmount → new saved`. It is **preview-only** — it never saves and
has no backend call. This is arguably correct as-is (it is a calculator, not an
action). It only needs backend work **if** "apply this one-off transfer" later
becomes a real command.

---

## 5. Files touched

**New components**
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitRow.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsForecastRow.tsx`
- plus a `*.test.tsx` for each of the three.

**Modified**
- `SavingsEditorPage.tsx` — composition, base-savings override state, placeholder save handler.
- `components/SavingsSoulHero.tsx` — base + goals split, funded-% pill.
- `components/SavingsPlanBalanceStrip.tsx` — six terms, honest Kvar (prop shape changed).
- `components/SavingsGoalContributionModal.tsx` — goal snapshot + contribution simulator.
- `utils/i18n/pages/private/savings/SavingsEditorPage.i18n.ts` — hero / Bassparande / balance / forecast keys.
- `utils/i18n/pages/private/savings/SavingsGoalModal.i18n.ts` — snapshot / simulator keys.
- Tests updated for the new hero and balance-strip contracts.

No backend, auth, Docker, Caddy or CI files were touched.

---

## 6. Open questions for the backend slice

1. **`Savings.MonthlySavings` editor endpoint** — **Resolved.** Shipped via
   PR 2 (`PATCH /api/budgets/months/{ym}/base-savings`) with three scopes
   (`currentMonthOnly` / `currentMonthAndBudgetPlan` / `budgetPlanOnly`) and
   the orphan rule (plan scopes rejected with `BaseSavings.PlanMissing`
   when `BudgetMonthSavings.SourceSavingsId IS NULL`). FE wired in PR 2.5;
   `isMonthOnly` exposed on the dashboard read in PR 2.6.
2. **Base figure equality** — **Resolved (Option B contract).** The two
   fields are intentionally **different**:
   - `dashboard.savings.monthlySavings` is the bassparande scalar
     (`Savings.MonthlySavings`).
   - `dashboard.savings.totalSavingsMonthly` is the total savings outflow:
     bassparande + Σ active goal `MonthlyContribution`.
   Earlier commits `84d008c8` and `fff019ac` had collapsed them to the
   same value ("keep goal allocations out of savings total"), making the
   dashboard understate outflow and disagree with the savings page's
   six-term strip. That contract has been superseded — see the changelog
   entry for the supersede commit. `totalSavingsMonthly` is now goals-
   inclusive in the projector and the snapshot totals service.
3. **Kvar identity** — **Resolved.** Under the goals-included contract,
   the dashboard's `finalBalance` subtracts both the bassparande base and
   the sum of goal contributions, so the six-term strip identity
   `kvar == income + carry − expenses − base − goals − debts` holds end-
   to-end. Dashboard "Pengaläge" and savings-page "Kvar" agree on the
   same user's open month.
4. **Forecast** — keep the FE projection, or build a real endpoint? (§4.2)
5. **One-off transfer** — is "apply" ever a real action, or does the simulator
   stay a calculator? (§4.3)

---

## 7. Validation

- `npx vitest --project unit run` — **307/307 passed** (41 files), incl. 119
  savings tests and 12 new tests for the three new components / updated
  contracts.
- `npx vite build` — **succeeds**.
- TypeScript `tsc` could not be run standalone (repo `tsconfig.json` uses
  `moduleResolution: "bundler"`, unsupported by the pinned TS 4.9.5; the project
  type-checks via the Vite/IDE toolchain). The build and the full test run are
  the available signal.
- **No live browser pass.** It needs the backend + dev database running with an
  open month; that was out of scope for this frontend-only slice. The page is
  exercised end-to-end by the `SavingsEditorPage.*.test.tsx` suites with mocked
  data.
