# PR 2.5 — Wire the Bassparande editor (frontend)

| | |
| --- | --- |
| **Type** | Frontend wiring — connect existing dialog to the PR 2 endpoint |
| **Depends on** | PR 1 (controller split) + PR 2 (`PATCH base-savings` endpoint) — both already in the working tree |
| **Blocks** | PR 3 (E2E). Two of the five planned specs cannot pass until this lands. |
| **Risk** | Low–medium — touches a financial save handler, but the BE write already works |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

The savings backend is now complete. The Bassparande (base monthly savings)
dialog on the frontend, however, **never reaches the network**. The dialog
shows a success toast, but:

- `SavingsEditorPage.handleSaveBaseHabit` (file: `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx`, lines ~141–149) only does
  `console.info("[savings-mvp] update Savings.MonthlySavings", payload)` and
  `setBaseMonthlyOverride(payload.amountMonthly)`. The value dies on reload.
- `SavingsBaseHabitDialog.tsx` (around L166–173) hard-codes
  `<EditScopeRadioCards canUpdatePlan />`, so all three scope buttons are
  always enabled. The BE's orphan rule (`BaseSavings.PlanMissing`) is never
  honoured by the UI — and there is no error surface to show the rejection.

This PR wires the dialog to the new endpoint and honours the orphan rule.

## 2. Read first

- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** — the audit that
  produced this PR queue. §2 (gap table), §3 (per-endpoint matrix row for
  `PATCH months/{ym}/base-savings`), §5 (testid sanity check), §6 (recommended
  sequence). Every claim there is anchored with file paths and line numbers.
- **`Work/Dashboard/savings/PR-02-base-savings-editor.md`** — the backend
  contract this PR consumes. §6.1 (request DTO), §6.2 (response DTO —
  `MonthlyAmount` + `IsMonthOnly`), §4 (scope table), §5 (orphan rule).
- **`docs/ai/ai-changelog.md`** — locally maintained changelog. Read the most
  recent entries to see what PR 1 + PR 2 actually shipped (file lists, scope
  notes), and append your own entry at the end of this PR.
- The actual committed-but-unpushed BE code is the source of truth — read
  `Backend/Application/DTO/Budget/Months/Editor/Savings/` and
  `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs`
  to confirm field names / casing / envelope shape before mirroring them on
  the FE.

## 3. Patterns to mirror (do not invent)

For every piece of work below, **find the closest existing wiring and copy
its shape**. The good models, in order of relevance:

| Concern | Mirror this | Where it lives |
| --- | --- | --- |
| Axios call + envelope unwrap | `patchBudgetMonthSavingsGoal` | `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts` |
| Mutation hook + cache invalidation | `usePatchBudgetMonthSavingsGoal` | `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts` (search for `usePatchBudgetMonthSavingsGoal` and its `onSuccess` → `invalidateBudgetMonthEditingQueries`) |
| FE DTO types | `PatchBudgetMonthSavingsGoalRequestDto` / `BudgetMonthSavingsGoalEditorRowDto` | `Frontend/src/types/budget/BudgetMonthsStatusDto.ts` |
| Dialog with `isSaving` + `errorMessage` + close-only-on-success | the goal "Justera mål" modal flow | `SavingsEditorPage.tsx` `handleSubmit` for `SavingsGoalContributionModal` (the existing async/error pattern in the same file) |

If your wiring looks structurally different from any of these, stop and
re-read — you're probably reinventing a pattern that already exists.

## 4. Work to do

### 4.1 FE types
Add (or co-locate, matching the file's existing convention) two types:

```ts
export interface PatchBudgetMonthBaseSavingsRequestDto {
  amountMonthly: number;          // decimal in JSON
  scope?: ExpenseEditScope;       // same three-string union the goal patch uses
}

export interface BudgetMonthBaseSavingsEditorDto {
  monthlyAmount: number;          // persisted current-month base savings
  isMonthOnly: boolean;           // true when BudgetMonthSavings.SourceSavingsId IS NULL
}
```

Place them in `Frontend/src/types/budget/BudgetMonthsStatusDto.ts` next to the
sibling savings DTOs. Mirror exact JSON casing the BE returns (the BE record
is `BudgetMonthBaseSavingsEditorDto(MonthlyAmount, IsMonthOnly)` — confirm
serialisation casing by reading one of the existing wired endpoints).

### 4.2 API function
Add `patchBudgetMonthBaseSavings(yearMonth, payload)` to
`monthEditor.api.ts`. Route: `PATCH api/budgets/months/{yearMonth}/base-savings`.
Wrap with `unwrapEnvelopeData(...)` exactly as every other function in that
file does.

### 4.3 Mutation hook
Add `usePatchBudgetMonthBaseSavings(yearMonth)` to `useMonthEditor.ts`. On
success it **must** call `invalidateBudgetMonthEditingQueries(queryClient, yearMonth)`
— same helper the goal mutations already use — so the dashboard hero,
balance strip, and recap re-fetch. Without this, the displayed Kvar will
drift from persisted state.

### 4.4 Dialog props + orphan gate
`SavingsBaseHabitDialog.tsx` needs three new props:

- `isMonthOnly: boolean` (orphan state)
- `isSaving: boolean`
- `errorMessage?: string | null`

Wire them:

- Pass `canUpdatePlan={!isMonthOnly}` to `<EditScopeRadioCards>`.
- Disable submit while `isSaving`; show a spinner / disabled state on the
  primary button.
- Render `errorMessage` in the form's existing error slot (or below the
  amount input if none exists) — do **not** swallow `BaseSavings.PlanMissing`.

> **Note for the orphan path** (audit §5 conditional row): `EditScopeRadioCards`
> currently *omits* the plan-scope cards entirely when `canUpdatePlan` is
> false. PR 3's orphan spec wants to assert `expect(scopeButton).toBeDisabled()`,
> which fails on an absent element. Change `EditScopeRadioCards` so plan-scope
> cards render **disabled** (with a short hint like "Den här månaden saknar
> planbasering") instead of vanishing. Keep the testids
> `savings-base-habit-scope-currentMonthAndBudgetPlan` and
> `savings-base-habit-scope-budgetPlanOnly` on the disabled cards so they
> remain queryable.

### 4.5 Page handler
Rewrite `handleSaveBaseHabit` in `SavingsEditorPage.tsx`:

- Call `await mutation.mutateAsync({ amountMonthly, scope })`.
- On success: close dialog, leave the toast as-is, **delete the
  `setBaseMonthlyOverride` line and the surrounding `baseMonthlyOverride`
  state entirely** (dashboard invalidation handles the refresh now).
- On failure: keep the dialog open, surface `error.message` via the new
  `errorMessage` prop.
- Remove the `console.info("[savings-mvp]" ...)` line.

### 4.6 Row testid for E2E
`SavingsBaseHabitRow.tsx` exposes `savings-base-habit-row` and
`savings-base-habit-edit-action`, but the **displayed amount span** has no
testid. Add `data-testid="savings-base-habit-amount"` to the amount node so
PR 3 §7.2 can assert the displayed value updates after save without grepping
locale-specific text.

### 4.7 First-open orphan state
Until PR 2.6 ships, the dashboard read does not expose `isMonthOnly`. For
this PR, default the prop to `false` on first open. The first save round-trip
will return the real `isMonthOnly` from the patch response; persist that
value in local state and pass it back into the dialog on subsequent opens.
(This is ugly but bounded — PR 2.6 fixes the read side.)

If PR 2.6 lands first, source `isMonthOnly` directly from the dashboard
query and skip the local-state workaround.

## 5. What NOT to do

- Do **not** change goal mutations, methods mutations, archive reads,
  forecast, or simulator code. They are already correctly wired (audit §3).
- Do **not** introduce a new query/mutation library, toast system, or error
  helper. Reuse what `usePatchBudgetMonthSavingsGoal` uses.
- Do **not** touch BE code in this PR — that's PR 2.6.
- Do **not** delete the success toast; the dialog should still confirm
  success to the user.
- Do **not** touch auth, Docker, Caddy, CI, or env config.

## 6. Acceptance criteria

- `grep -r "base-savings" Frontend/src` now returns ≥ 3 hits (api function,
  hook, dialog/page wiring).
- The Bassparande dialog persists across reload for a seeded user.
- For an orphan month (`BudgetMonthSavings.SourceSavingsId IS NULL`), the
  plan-scope cards render as **disabled** with the new hint copy; submitting
  with one of them selected is not possible. `currentMonthOnly` still works.
- A failed save surfaces the BE error message in the dialog; the dialog stays
  open.
- `console.info("[savings-mvp]" ...)` is gone from
  `Frontend/src/Pages/private/savings/`. `baseMonthlyOverride` state is gone.
- Dashboard hero, balance strip, and recap refresh after a successful save
  (manual check: edit amount, observe Kvar updates without a manual reload).
- `npm run build` and `npm run test` succeed; existing
  `SavingsEditorPage.balance.test.tsx` / `SavingsEditorPage.create.test.tsx`
  still pass — update them if the dialog props changed.

## 7. Validation

```
cd Frontend && npm run build
cd Frontend && npm run test -- SavingsEditorPage
```

Manual smoke against a local dev backend:

```
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
cd Backend && DOTNET_USE_POLLING_FILE_WATCHER=true dotnet watch run --urls http://localhost:5001
cd Frontend && npm run dev
```

Edit the bassparande amount → reload → value persists. Network tab shows
`PATCH /api/budgets/months/{ym}/base-savings` with the right payload and the
envelope-wrapped response.

## 8. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, risks/follow-up).
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `feat(savings): wire bassparande dialog to base-savings endpoint`.
3. Stop. Do not commit or push.
