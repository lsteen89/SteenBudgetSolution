# Savings — Frontend ↔ Backend Wiring Audit

**Date:** 2026-05-23
**Branch:** `feature/PolishDashboardEditor`
**Scope:** `/dashboard/savings` editor (`Frontend/src/Pages/private/savings/**`)
plus the savings slice in `Backend/Application/Features/Budgets/Months/Editor/Savings/**`
and `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs`.
Read-only investigation — no production code was edited.

---

## 1. Executive summary

The savings backend is fully wired except for one feature: **the Bassparande
(base monthly savings) editor**. PR 2 shipped the BE endpoint
(`PATCH /api/budgets/months/{ym}/base-savings`) with the right response DTO
(`MonthlyAmount` + `IsMonthOnly`), but the frontend was never updated to call it.

The Bassparande dialog still:

- never reaches the network — save handler only logs and writes session-local
  state (`SavingsEditorPage.tsx:141-149`);
- always renders all three scope buttons as enabled because the dialog hard-codes
  `canUpdatePlan` (`SavingsBaseHabitDialog.tsx:166-173`);
- has no awareness of the `IsMonthOnly` orphan flag — the BE will silently
  protect us with `BaseSavings.PlanMissing`, but the FE has no error surface to
  display that response, and the dialog will happily round-trip a plan write
  that the BE will reject;
- has no testid on the **edit-amount input** (only the wrapping form / row).

All goal lifecycle endpoints (create / patch / patch-bulk / complete / cancel /
remove), savings methods (get / add / remove), and the archive (`old`) read are
correctly wired and invalidate the dashboard cache after a mutation
(`useMonthEditor.ts:284-366`, `invalidateBudgetMonthEditingQueries.ts`).
Forecast and contribution simulator are FE-only by design — confirmed no
half-wired API attempts.

**Verdict:** PR 3 (E2E) should be **paused** until a small "PR 2.5" lands that
wires the Bassparande dialog to the new endpoint. Two of the five planned E2E
specs (`savings-base-habit-edit.spec.ts` and `savings-balance-identity.spec.ts`
in the orphan path) cannot pass against the current FE — the orphan path has no
disabled state to assert against because the buttons are always enabled, and
the current-month write will not persist across reload because it never reaches
the BE.

**Severity tally:** 1 blocker, 3 major, 2 minor, 1 cosmetic.

---

## 2. Gap table

| Severity | Surface | Expected | Actual | Recommended fix |
| --- | --- | --- | --- | --- |
| **Blocker** | Bassparande save | `handleSaveBaseHabit` calls `PATCH /api/budgets/months/{ym}/base-savings` and refreshes dashboard + cache. | `SavingsEditorPage.tsx:141-149` only does `console.info("[savings-mvp] update Savings.MonthlySavings", payload)` and `setBaseMonthlyOverride(payload.amountMonthly)`. No api file, no hook. `grep base-savings Frontend/src` returns zero hits. | Add `patchBudgetMonthBaseSavings(ym, payload)` in `monthEditor.api.ts`, expose `usePatchBudgetMonthBaseSavings(ym)` in `useMonthEditor.ts` that calls `invalidateBudgetMonthEditingQueries`; switch `handleSaveBaseHabit` to `await mutation.mutateAsync(...)` and remove `baseMonthlyOverride`. |
| **Blocker** | Bassparande dialog scope gate | When the open month is an orphan (`BudgetMonthSavings.SourceSavingsId IS NULL`), the dialog disables `currentMonthAndBudgetPlan` and `budgetPlanOnly` (BE response field `IsMonthOnly = true`). | `SavingsBaseHabitDialog.tsx:166-173` hard-codes `<EditScopeRadioCards canUpdatePlan>` — all three scopes are *always* rendered & enabled, and the dialog never receives or threads an `isMonthOnly` prop. BE will reject the plan write with `BaseSavings.PlanMissing`, but the FE has no path to display that error. | Add `isMonthOnly` (and ideally `isSaving`/`error`) props to `SavingsBaseHabitDialog`. Pass `canUpdatePlan={!isMonthOnly}` to `EditScopeRadioCards`. Source `isMonthOnly` from the FE's monthly dashboard or — cleaner — from the patch response itself (returned on every call). For initial state before the first mutation, derive it from the dashboard query or a tiny `GET base-savings` (see Major below). |
| **Major** | Bassparande orphan initial state | The dialog needs to know `IsMonthOnly` *before* the first save, so the orphan disables happen on first open. | The BE only returns `IsMonthOnly` on the `PATCH` response. The dashboard month query does not expose `sourceSavingsId` or any `isMonthOnly` flag — `useBudgetDashboardMonthQuery` only carries the `monthlySavings` scalar. | Either (a) extend the dashboard `SavingsOverviewDto` with an `isMonthOnly` boolean, or (b) add a tiny `GET months/{ym}/base-savings` companion to the PATCH so the FE has a read endpoint. (a) is cheaper and keeps the dashboard the single source of truth for read state. |
| **Major** | Bassparande dialog save UX | Async mutation, error message, disabled buttons during pending. | Dialog props expose `isSaving`/`onSave` but `SavingsEditorPage.handleSaveBaseHabit` is synchronous, never throws, never sets `isSaving`. No `error` prop, no place to render `BaseSavings.PlanMissing` / network error. | When wiring the mutation, pass `isSaving={mutation.isPending}` and surface failure via a local `error` state shown in the FormField; only close on success. Existing `handleSubmit` for the goal modal (`SavingsEditorPage.tsx:224-250`) is the model. |
| **Major** | Bassparande row testid for amount | PR-03 §7.2 needs to read the displayed bassparande amount after edit. | `SavingsBaseHabitRow.tsx` has `savings-base-habit-row` and `savings-base-habit-edit-action`, but the amount text itself has **no** testid. | Add `data-testid="savings-base-habit-amount"` (or similar) to the amount span in `SavingsBaseHabitRow.tsx` so E2E can read it without depending on locale strings. |
| Minor | Per-term breakdown testids | PR-03 §7.5 reads each balance-strip term (income / carry / expenses / base / goals / debts / kvar) by testid for the six-term identity check. | `SavingsPlanBalanceStrip.tsx` exposes `savings-plan-balance-strip`, `-headline`, `-chip`, `-message`, `-breakdown` only. The seven individual `<dd>` cells inside `-breakdown` have no testids — the identity test would have to fall back to text matching. | Add `data-testid="savings-plan-balance-term-<key>"` (or pass a `testId` prop into the breakdown row map) for `income`, `carryOver`, `expenses`, `baseSavings`, `goalSavings`, `debtPayments`, `remaining`. |
| Minor | Stale session override on dialog close | When the save succeeds the FE wipes `baseMonthlyOverride` on month change, but `useBudgetDashboardMonthQuery` is *not* re-fetched (no mutation runs → no invalidation), so the hero / balance strip stay aligned with the override only. After reload the dashboard reverts to the un-edited value. | `SavingsEditorPage.tsx:137-149` — direct consequence of the blocker above. Once the mutation is wired, drop the `baseMonthlyOverride` state entirely; dashboard invalidation will refresh everything. | Folded into the blocker fix — no separate work. |
| Cosmetic | `console.info` placeholder | Production code should not ship a debug `console.info`. | `SavingsEditorPage.tsx:145`. | Remove when the mutation is wired. |

---

## 3. Per-endpoint matrix

| Backend endpoint | FE call site | DTO match | Status |
| --- | --- | --- | --- |
| `GET months/{ym}/savings-goals` | `getBudgetMonthSavingsGoals` (`monthEditor.api.ts:163`) via `useBudgetMonthSavingsGoals` (`useMonthEditor.ts:205-220`) | Yes — `BudgetMonthSavingsGoalEditorRowDto` keys (`id`, `sourceSavingsGoalId`, `monthlyContribution`, `isMonthOnly`, `canUpdateDefault`, …) match. | Wired. |
| `GET months/{ym}/savings-goals/old` | `getBudgetMonthSavingsOldGoals` (`monthEditor.api.ts:177`) via `useBudgetMonthSavingsOldGoals` | Yes. | Wired. |
| `GET months/{ym}/savings-methods` | `getBudgetMonthSavingsMethods` (`monthEditor.api.ts:194`) via `useBudgetMonthSavingsMethods` | Yes. | Wired. |
| `POST months/{ym}/savings-methods` | `addBudgetMonthSavingsMethod` (`monthEditor.api.ts:209`) via `useAddBudgetMonthSavingsMethod` | Yes (`code`, optional `customLabel`). Invalidates methods key (`useMonthEditor.ts:264-267`). | Wired. |
| `DELETE months/{ym}/savings-methods/{id}` | `removeBudgetMonthSavingsMethod` (`monthEditor.api.ts:221`) via `useRemoveBudgetMonthSavingsMethod` | Yes. Invalidates methods key. | Wired. |
| `POST months/{ym}/savings-goals` | `createBudgetMonthSavingsGoal` (`monthEditor.api.ts:247`) via `useCreateBudgetMonthSavingsGoal` | Yes (`name`, `targetAmount`, `targetDate`, `amountSaved`, `monthlyContribution`). Invalidates editor + dashboard. | Wired. |
| `PATCH months/{ym}/savings-goals/{id}` | `patchBudgetMonthSavingsGoal` (`monthEditor.api.ts:232`) via `usePatchBudgetMonthSavingsGoal` | Yes (`monthlyContribution`, optional `targetDate`, `scope`). FE `SavingsGoalEditScope = ExpenseEditScope` is the same three-string union the BE expects. | Wired. |
| `PATCH months/{ym}/savings-goals` (bulk) | `patchBudgetMonthSavingsGoalsBulk` (`monthEditor.api.ts:263`) via `usePatchBudgetMonthSavingsGoalsBulk` | Yes. | Wired — *but* no UI surface currently calls it. Not a gap; just unused. |
| `POST months/{ym}/savings-goals/{id}/complete` | `completeBudgetMonthSavingsGoal` (`monthEditor.api.ts:276`) via `useCompleteSavingsGoalMutation` | Yes. Invalidates editor + dashboard. | Wired. |
| `POST months/{ym}/savings-goals/{id}/cancel` | `cancelBudgetMonthSavingsGoal` (`monthEditor.api.ts:289`) via `useCancelSavingsGoalMutation` | Yes. Invalidates editor + dashboard. | Wired. |
| `POST months/{ym}/savings-goals/{id}/remove` | `removeBudgetMonthSavingsGoal` (`monthEditor.api.ts:302`) via `useRemoveSavingsGoalMutation` | Yes. Invalidates editor + dashboard. | Wired. |
| **`PATCH months/{ym}/base-savings`** (PR 2) | **None.** No api function, no hook, no call site. `grep -r "base-savings\|BaseSavings" Frontend/src` returns zero hits. | n/a — never called. BE accepts `{ amountMonthly: decimal, scope?: string }` and returns `{ monthlyAmount: decimal, isMonthOnly: bool }`. | **Missing.** |

Scope enum values agree across the stack: FE `EditScopeRadioCardValue`
(`EditScopeRadioCards.tsx:7-10`) and `ExpenseEditScope`
(`BudgetMonthsStatusDto.ts:47-50`) both use the camelCase strings
`currentMonthOnly` / `currentMonthAndBudgetPlan` / `budgetPlanOnly`, which is
exactly what `BudgetMonthBaseSavingsEditScopes.IsSupported` accepts.

Response envelopes are unwrapped consistently — every savings api function
goes through `unwrapEnvelopeData(res, ...)` (`monthEditor.api.ts:174, 188,
206, 218, 229, 244, 255, 273, 286, 299, 312`). The missing base-savings call
should follow the same pattern.

---

## 4. Placeholders found

Single hit — search was `grep -rn "console.info\|\\[savings-mvp\\]" Frontend/src/Pages/private/savings/`:

| File:line | What it pretends to do | Reality |
| --- | --- | --- |
| `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:145` | `console.info("[savings-mvp] update Savings.MonthlySavings", payload);` followed by `setBaseMonthlyOverride(payload.amountMonthly)` | Local React state only. Dies on reload, never persists, never hits the BE. Toast still shows success — the UI lies. |

No other `console.info` / `console.warn` / `console.debug` / `[savings-...]`
markers exist in `Frontend/src/Pages/private/savings/`. Forecast row and
contribution simulator are clean — they perform pure FE math and never attempt
an API call.

---

## 5. Testid sanity check (PR-03 brief §5)

PR-03 §5 lists every testid the E2E specs expect. Cross-referenced against
`grep -rn 'data-testid\|testId=' Frontend/src/Pages/private/savings/`:

**Present and correctly wired** (no gap):
`savings-plan-balance-strip`, `savings-plan-balance-headline`,
`savings-plan-balance-chip`, `savings-goal-cards`, `savings-goal-cards-empty`,
`savings-goal-add-placeholder`, `savings-goal-card`, `savings-progress-legend`,
`savings-goal-draft-card`, `savings-draft-submit`, `savings-draft-error`,
`savings-goal-modal-snapshot`, `savings-goal-modal-target-date-caption`,
`savings-goal-budget-warning`, `savings-goal-modal-scope-toggle`,
`savings-goal-simulator-result`, `savings-methods-editor`,
`savings-methods-suggestion`, `savings-methods-remove`,
`savings-methods-editor-error`, `savings-old-goals-section`,
`savings-old-goals-toggle`, `savings-old-goals-count`,
`savings-old-goals-list`, `savings-old-goal-row`, `savings-old-goal-status`,
`savings-base-habit-scope-currentMonthOnly`,
`savings-base-habit-scope-currentMonthAndBudgetPlan`,
`savings-base-habit-scope-budgetPlanOnly`.

**Missing or conditionally rendered — flag for the test agent:**

| Testid | Status | Notes |
| --- | --- | --- |
| `savings-base-habit-scope-currentMonthAndBudgetPlan` (orphan path) | **Conditional** | `EditScopeRadioCards.tsx:70-90` renders the plan-scope `<ScopeCard>`s only when `canUpdatePlan` is true. The orphan spec's `expect(scopeButton).toBeDisabled()` will fail with "element not found" once the dialog correctly drops the prop. The fix is to make `EditScopeRadioCards` render disabled plan cards instead of skipping them, or have the orphan assertion be `expect(scopeButton).toHaveCount(0)` / "the disabled-plan hint copy is visible". Decide and document before §7.2 is written. |
| `savings-base-habit-scope-budgetPlanOnly` (orphan path) | **Conditional** | Same as above. |
| Per-term balance breakdown testids (`-income`, `-carry`, `-expenses`, `-base`, `-goals`, `-debts`, `-kvar` or similar) | **Missing** | PR-03 §7.5 needs them for the six-term identity check. Currently the breakdown grid in `SavingsPlanBalanceStrip.tsx:201-238` emits anonymous `<dd>` cells. PR-03 §5 footnote permits adding new testids that follow the `savings-*` convention. |
| `savings-base-habit-amount` (the displayed row value) | **Missing** | `SavingsBaseHabitRow.tsx` only carries `savings-base-habit-row` and `-edit-action`. PR-03 §7.2 needs to assert the displayed amount changed after save. |
| `savings-forecast-row` referenced in §7.1 ("forecast row exists") | Present | `SavingsForecastRow.tsx:55`. Good. |
| `savings-methods-strip` (referenced indirectly for the methods spec) | Present | `SavingsMethodsStrip.tsx:79`. Good. |

---

## 6. Recommended PR sequence

### PR 2.5 — Wire the Bassparande editor (FE only, mandatory before PR 3)

**Touches:** `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`,
`Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`,
`Frontend/src/types/budget/BudgetMonthsStatusDto.ts` (add the two new DTO
types), `SavingsBaseHabitDialog.tsx`, `SavingsBaseHabitRow.tsx` (add amount
testid), `SavingsEditorPage.tsx` (mutation + remove `baseMonthlyOverride` +
remove `console.info`).

**Adds**

1. FE types `PatchBudgetMonthBaseSavingsRequestDto` and
   `BudgetMonthBaseSavingsEditorDto` mirroring `Backend/Application/DTO/...`.
2. `patchBudgetMonthBaseSavings(yearMonth, payload)` api function.
3. `usePatchBudgetMonthBaseSavings(yearMonth)` hook that calls
   `invalidateBudgetMonthEditingQueries(queryClient, yearMonth)` on success.
4. `SavingsBaseHabitDialog` accepts `isMonthOnly` + `isSaving` + `errorMessage`
   props; passes `canUpdatePlan={!isMonthOnly}` to `EditScopeRadioCards` (and
   `disabledPlanHint` so the orphan path has visible copy instead of a missing
   card).
5. `SavingsEditorPage.handleSaveBaseHabit` awaits the mutation, surfaces errors,
   closes the dialog only on success, drops `baseMonthlyOverride` entirely.
6. Source `isMonthOnly` for the first dialog open from wherever the dashboard
   exposes it (see PR 2.6 below — if that's not in yet, default the prop to
   `false` and rely on the BE's `PlanMissing` rejection to teach the FE the
   first time, then keep the latest `IsMonthOnly` from the patch response).

### PR 2.6 — Expose `isMonthOnly` on the dashboard read (BE + FE)

**Touches:** dashboard projector + `SavingsOverviewDto` + FE dashboard hook.

So the dialog knows the orphan state on first open without needing a separate
round-trip. Small change; can be folded into PR 2.5 if the reviewer prefers a
single PR.

### PR 2.7 — Add per-term testids to `SavingsPlanBalanceStrip`

**Touches:** `SavingsPlanBalanceStrip.tsx` only.

Adds `data-testid="savings-plan-balance-term-{key}"` to each `<dd>` in the
breakdown. Pure additive; no behaviour change.

### PR 3 — Playwright E2E (the existing brief)

Unblocked once PR 2.5 (mandatory) and PR 2.7 (mandatory) are in. PR 2.6 is
"strongly preferred" but PR 3 can technically work around its absence by
opening + closing the dialog once before asserting orphan state — ugly, do PR
2.6 first.

---

## 7. Cross-cutting confirmation

- **Dashboard re-fetch after mutation.** `invalidateBudgetMonthEditingQueries`
  (`invalidateBudgetMonthEditingQueries.ts:13-43`) invalidates
  `budgetDashboardMonthQueryKey(yearMonth)` and the recap key, so the hero +
  balance strip recompute after every goal / method mutation. The base-savings
  mutation, when wired, must reuse this helper.
- **Envelope handling.** Consistent — `unwrapEnvelopeData` everywhere in
  `monthEditor.api.ts`.
- **Scope enum agreement.** Same three camelCase strings on both sides; no
  mismatch.
- **Forecast / simulator.** Confirmed FE-only by reading
  `SavingsForecastRow.tsx` and `SavingsGoalContributionModal.tsx:118-120,
  237-253`. Neither attempts a network call. Matches the deferred decision in
  `Work/Dashboard/savings/README.md`.
