# PR 08 — Goal card → action chips + focused Månadsbelopp / Måldatum modals (frontend)

| | |
| --- | --- |
| **Type** | Frontend refactor — replaces the per-goal "Justera" modal with V2's action-chip row and focused modals. |
| **Depends on** | None of the new BE work. Uses the already-shipped `PatchSavingsGoal` endpoint (monthly + targetDate + scope). Independent of PR 05 / 06 / 07. |
| **Blocks** | PR 09 (Engångsöverföring wires into the chip row). PR 10 (kebab items wire into the kebab). |
| **Risk** | Medium-low — removes a live modal and replaces it with three new components. Carefully preserves the scope semantics already enforced by `PatchSavingsGoal` (and the Bug A fix from PR-2.8). |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

The current `SavingsGoalCard` has a single **"Justera"** button that opens
a kitchen-sink `SavingsGoalContributionModal`. V2 splits this into:

- An always-visible **action row** on each card:
  - **Sätt in** (primary) — opens transfer modal *(PR-09 wires the
    endpoint; this PR scaffolds the chip as `disabled` with a "Snart"
    hint)*.
  - **Månadsbelopp** — opens the new `SavingsGoalMonthlyModal`.
  - **Måldatum** — opens the new `SavingsGoalTargetDateModal`.
  - **⋯** kebab — Byt namn / Ändra målbelopp / Arkivera mål / Ta bort
    mål. Arkivera + Ta bort already work today (lifecycle endpoints);
    the other two are scaffolded `disabled` until PR-10.

Why split now (before all BE lands): the two modals **Månadsbelopp** and
**Måldatum** map cleanly to the existing `PatchSavingsGoal` endpoint with
different field subsets. Shipping them removes the multi-purpose modal
and stabilises the per-action contract for PR-09 / PR-10.

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`** — V2 intent, ground rules.
- **`Frontend/src/Pages/private/savings/components/SavingsGoalCard.tsx`** —
  the source. The action row replaces the bottom-right Justera block
  starting at L169.
- **`Frontend/src/Pages/private/savings/components/SavingsGoalContributionModal.tsx`** —
  to be **deleted** at end of PR (after the focused modals are in place
  and the page no longer wires it). Preserve:
  - The scope-strip semantics (`currentMonthOnly` vs
    `currentMonthAndBudgetPlan`) — re-use `EditScopeRadioCards`.
  - The `canUpdateDefault` gate (orphan rule, Bug A fix from PR-2.8).
  - The budget-warning copy block (L217–233, L439–450) — moves verbatim
    into the new Månadsbelopp modal.
  - The snapshot dl (L368–385) — moves verbatim into both modals.
  - The lifecycle action footer (L490–526) — moves into the kebab
    (PR-10's responsibility to wire complete/cancel/remove from kebab
    items; this PR scaffolds the kebab structure).
  - DROP the contribution simulator (L462–488) — V2 removed it.
  - DROP the targetDate field from the Månadsbelopp modal — date editing
    moves to a separate modal in this PR.
- **`/tmp/design-bundle/ebudget-design-system/project/explorations/savings/MVP-Savings v2.html`** —
  the V2 design. Card action row lives at lines ~1699–1722. The
  Månadsbelopp modal at lines ~2149–2212. The Måldatum modal at
  ~2219–2282.
- **`Frontend/src/Pages/private/savings/SavingsEditorPage.tsx`** — wires
  the modal today; will wire the new modals.

## 3. Scope

**In:**

1. New `SavingsGoalActionRow` component (chips + kebab structure).
2. New `SavingsGoalMonthlyModal` (one BE call:
   `PatchSavingsGoal(monthlyContribution + scope)`).
3. New `SavingsGoalTargetDateModal` (one BE call:
   `PatchSavingsGoal(targetDate, scope: currentMonthAndBudgetPlan)` +
   optional `monthlyContribution` recompute when the user picks
   `recalcMonthly` mode — FE-computed value).
4. `SavingsGoalCard` rebuilt to host the action row, dropping the single
   "Justera" button.
5. `SavingsEditorPage` rewired: drop `SavingsGoalContributionModal`, host
   the two new modals + the kebab confirm-dialog
   (`SavingsGoalLifecycleConfirmDialog` already exists — reuse).
6. Delete `SavingsGoalContributionModal.tsx` + its test file.
7. Tests for both new modals; tests for the action-row component;
   updated tests for `SavingsGoalCard` (new structure).

**Out:**

- Engångsöverföring modal + endpoint wiring (PR-09).
- Rename + Ändra målbelopp kebab wiring (PR-10).
- Habit/buffer "Sätt in extra" chip on the bassparande row (PR-09).
- E2E specs for the new chips (PR-11).

## 4. Action-row contract (precise)

```
<SavingsGoalActionRow
  row={row}
  readOnly={readOnly}
  baselineSupported={row.canUpdateDefault}     // orphan gate
  onDeposit={() => void}        // disabled in PR-08 ("Snart")
  onMonthly={() => void}        // opens SavingsGoalMonthlyModal
  onTargetDate={() => void}     // opens SavingsGoalTargetDateModal
  onRename={() => void}         // disabled in PR-08 ("Snart")
  onChangeTarget={() => void}   // disabled in PR-08 ("Snart")
  onArchive={() => void}        // opens lifecycle confirm dialog (complete)
  onRemove={() => void}         // opens lifecycle confirm dialog (remove)
/>
```

Disabled chips:

- Render with the same chip class but `aria-disabled`,
  `cursor-not-allowed`, opacity-50, and a `title` / tooltip text reading
  `t("comingSoon")` = "Snart". This keeps the layout stable for PR-09 /
  PR-10 to drop in.
- Tests must assert that disabled-state chips do not call the handler on
  click and announce themselves as disabled to screen readers.

Kebab structure (per V2 design):

- `Byt namn` (disabled in PR-08)
- `Ändra målbelopp` (disabled in PR-08)
- `---` divider
- `Arkivera mål` → opens `SavingsGoalLifecycleConfirmDialog` with action
  `complete`.
- `Ta bort mål` (danger style) → opens dialog with action `remove`.

Kebab close behaviour: closes on outside click, on Escape, when a menu
item is chosen, and when another card's kebab opens. Pattern: copy
`/tmp/design-bundle/ebudget-design-system/project/explorations/savings/MVP-Savings v2.html`
lines ~2703–2708 — but use React state in `SavingsGoalActionRow`, not
DOM mutation.

## 5. Månadsbelopp modal (precise)

| | |
| --- | --- |
| **Component** | `SavingsGoalMonthlyModal.tsx` (new) |
| **Endpoint** | `PATCH …/savings-goals/{id}` with `{ monthlyContribution, scope }` (existing). |
| **Submits** | `monthlyContribution: number`, `scope: SavingsGoalEditScope`. **Never** sends `targetDate`. |
| **Snapshot** | Same 3-cell dl that the old modal used (saved / target / deadline). Reuse `SnapshotCell`. |
| **Big input** | Reuse `MoneyInput`. |
| **Scope strip** | Reuse `EditScopeRadioCards` with `canUpdatePlan = row.canUpdateDefault` (preserves PR-2.8 orphan gate). |
| **Outcome line** | Localised "Når målet om ca X mån (Y mån tidigare/senare)". Pure FE math from `row.targetAmount - row.amountSaved` and the entered monthly. Same formula the V2 design uses. |
| **Budget warning** | Keep the existing `budgetImpactExceeds` warning block from the old modal — same `remainingBudgetRoom` prop. |
| **Validation** | Reuse `buildPatchSavingsGoalAdjustFormSchema` with `enforceTargetDate: false`. |
| **i18n** | New keys under a new dict file `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalMonthlyModal.i18n.ts`. |

## 6. Måldatum modal (precise)

| | |
| --- | --- |
| **Component** | `SavingsGoalTargetDateModal.tsx` (new) |
| **Endpoint** | `PATCH …/savings-goals/{id}` with `{ monthlyContribution, scope: "currentMonthAndBudgetPlan", targetDate }`. |
| **Mode strip** | V2's two-option scope strip — `recalcMonthly` vs `keepMonthly`. Both modes write `targetDate`. The difference is `monthlyContribution`: in `recalcMonthly` the FE computes `ceil(remaining / monthsToTarget)` and sends it; in `keepMonthly` the FE sends `row.monthlyContribution` unchanged. |
| **Snapshot** | Same 3-cell dl. |
| **Date input** | `<input type="month">` per V2 design. Localised caption underneath (reuse `formatIsoDateForDisplay`). |
| **Outcome line** | Localised: in `recalcMonthly` shows "Nytt datum X · behöver spara Y kr/mån (+/- Z kr/mån)". In `keepMonthly` shows "Med X kr/mån når du målet redan Y" or "Hinner bara X kr". Pure FE math; same formula as V2's `recomputeDate`. |
| **Validation** | Reuse the same schema with `enforceTargetDate: true`. The endpoint already gates targetDate writes to the `currentMonthAndBudgetPlan` scope at the BE — pass the scope explicitly. |
| **canUpdatePlan gate** | If `!row.canUpdateDefault` (orphan), the modal opens disabled with a hint pointing to the bassparande dialog's existing orphan copy — same UX as the scope strip's disabled-plan state. |
| **i18n** | `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTargetDateModal.i18n.ts`. |

## 7. Files to touch

**New:**

- `Frontend/src/Pages/private/savings/components/SavingsGoalActionRow.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalActionRow.test.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.test.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalTargetDateModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalTargetDateModal.test.tsx`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalMonthlyModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTargetDateModal.i18n.ts`

**Modified:**

- `Frontend/src/Pages/private/savings/components/SavingsGoalCard.tsx` — drop "Justera" block, mount `SavingsGoalActionRow`.
- `Frontend/src/Pages/private/savings/components/SavingsGoalCard.test.tsx` — update assertions (action row exists; old button gone).
- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx` — drop `SavingsGoalContributionModal`, host the two new modals + the (already-existing) lifecycle confirm dialog. Wire `onArchive` to `complete` and `onRemove` to `remove`.
- `Frontend/src/utils/i18n/pages/private/savings/SavingsEditorPage.i18n.ts` — add `comingSoon`, action labels, kebab labels.

**Deleted:**

- `Frontend/src/Pages/private/savings/components/SavingsGoalContributionModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalContributionModal.test.tsx`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalModal.i18n.ts` (replaced by the two new dict files).

## 8. Tests

For each new component:

- Render in `readOnly=true` → all chips disabled, click no-ops.
- Render in `baselineSupported=false` (orphan) → Måldatum modal opens
  with the scope strip showing only the snapshot scope as enabled.
- Submit happy path → mutation called with the right payload shape.
- Validation error → error surface in the form field, no mutation call.
- Snapshot dl always renders even when `targetAmount` is null.

`SavingsGoalActionRow.test.tsx`:

- Chips render in the V2 order.
- Kebab opens / closes on outside click / Escape / second open.
- Disabled-state chips do not fire callbacks; aria-disabled is set.

`SavingsEditorPage` integration (vitest with the existing mocked hooks):

- Open Månadsbelopp modal → Save → `usePatchBudgetMonthSavingsGoal` is
  called with `{ monthlyContribution, scope }` only (no `targetDate`).
- Open Måldatum modal in `recalcMonthly` mode → Save → mutation called
  with the recomputed monthly and the new `targetDate`.
- Open Måldatum modal in `keepMonthly` → mutation called with the
  *unchanged* `monthlyContribution` and the new `targetDate`.
- Kebab → Arkivera → confirm → `useCompleteSavingsGoalMutation` invoked.
- Kebab → Ta bort → confirm → `useRemoveSavingsGoalMutation` invoked.

## 9. Validation

- `npm run build` and `npx vitest --project unit run` in `Frontend/`.
  Target: all new + updated test files green; no regressions in the
  rest of the savings folder.
- Local browser pass on the savings page with a seeded dev DB:
  - Cards show the three chips + kebab.
  - Månadsbelopp modal saves; the number on the card updates without a
    full reload (mutation invalidates the query).
  - Måldatum modal saves; the target-date subtitle on the card updates.
  - Kebab → Arkivera moves the goal to "Tidigare mål" without a
    refresh.

## 10. Out of scope

- Engångsöverföring modal — PR-09.
- Rename + Ändra målbelopp wiring — PR-10.
- Habit row "Sätt in extra" chip — PR-09.
- E2E (Playwright) — PR-11.

## 11. After the task

Append `docs/ai/ai-changelog.md` (date, files, validation, risks), write
`COMMIT_MSG.tmp`
(`refactor(savings): replace goal-card Justera button with V2 action chips + focused modals`),
then stop.
