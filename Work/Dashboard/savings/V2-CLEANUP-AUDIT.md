# Savings — current-state audit & V2 cleanup plan

| | |
| --- | --- |
| **Purpose** | Inventory every savings-related surface that exists on `feature/PolishDashboardEditor` today, map each one to V2 (keep / replace / deprecate), and capture the cleanup that should land *after* the V2 implementation. |
| **Date** | 2026-05-24 |
| **Audited against** | `feature/PolishDashboardEditor` HEAD = `bd81c6ec`, and the design `explorations/savings/MVP-Savings v2.html`. |
| **Read with** | `PR-V2-OVERVIEW.md` (the build plan). |

---

## 1. Headline finding

**Nothing built in this branch is wasted.** Every endpoint, hook, and
component either survives V2 unchanged or is the foundation the V2 modals
are written on top of.

The cleanup surface is small and almost entirely **frontend-only**:

- One FE modal (`SavingsGoalContributionModal`) is replaced by three
  focused modals (PR-08).
- One FE drawer panel (`SavingsPanel` in the old `EditPeriodDrawer`) is a
  legacy surface that pre-dates the dedicated `SavingsEditorPage`. It
  bulk-edits monthly contributions through `PatchSavingsGoalsBulk`. V2
  does not need it; whether to retire it is a product decision (§6).
- A small number of FE i18n keys and the contribution-simulator copy can
  be removed as we go.

The backend is **fully retained**. V2 adds three new slices on top.

---

## 2. Backend — full endpoint inventory

All routes are scoped under `/api/budget` and live in
`BudgetController.Editor.Savings.cs`. Status per V2 below.

| # | Method + route | Slice folder | V2 role | Notes |
| - | --- | --- | --- | --- |
| 1 | `GET    /months/{ym}/savings-goals`           | `GetSavingsGoals/`           | **Keep — read for the page** | Backs the card list. No DTO change needed for V2. |
| 2 | `GET    /months/{ym}/savings-goals/old`       | `GetOldSavingsGoals/`        | **Keep — read for "Tidigare mål"** | Archive section is retained in V2 verbatim. |
| 3 | `GET    /months/{ym}/savings-methods`         | `GetSavingsMethods/`         | **Keep — methods strip + transfer modal "source/from" select** | PR-09 reuses this hook for the deposit-source list. |
| 4 | `POST   /months/{ym}/savings-methods`         | `AddSavingsMethod/`          | **Keep — methods modal** | Methods modal is retained in V2 (HTML lines ~2007–2060). |
| 5 | `DELETE /months/{ym}/savings-methods/{id}`    | `RemoveSavingsMethod/`       | **Keep — methods modal** | Same. |
| 6 | `POST   /months/{ym}/savings-goals`           | `CreateSavingsGoal/`         | **Keep — "Lägg till sparmål"** | V2 keeps the draft card / form unchanged (HTML lines ~1873–1910). |
| 7 | `PATCH  /months/{ym}/savings-goals/{id}`      | `PatchSavingsGoal/`          | **Keep — backs PR-08's Månadsbelopp + Måldatum modals** | The single most-reused BE slice in V2. Already supports monthly + targetDate + scope. No change required. |
| 8 | `PATCH  /months/{ym}/savings-goals`           | `PatchSavingsGoalsBulk/`     | **Keep — but unused by V2 page** | Only the legacy `EditPeriodDrawer` SavingsPanel consumes it (FE inventory §3). Retain on the BE; decision on the FE caller in §6. |
| 9 | `POST   /months/{ym}/savings-goals/{id}/complete` | `CompleteSavingsGoal/`   | **Keep — kebab "Arkivera mål"** | Wired in PR-08. |
| 10 | `POST   /months/{ym}/savings-goals/{id}/cancel`  | `CancelSavingsGoal/`     | **Keep — close-month flow** | The savings editor page does not surface "Cancel" today; only the close-month modal uses it (`SavingsGoalLifecycleConfirmDialog` allows `cancel`, but V2's kebab maps Arkivera → complete). Retain the endpoint as-is. |
| 11 | `PATCH  /months/{ym}/base-savings`            | `PatchBaseSavings/`          | **Keep — bassparande row** | Already wired by PR 2.5. V2 keeps the bassparande row + dialog. |
| 12 | `POST   /months/{ym}/savings-goals/{id}/remove`  | `RemoveSavingsGoal/`     | **Keep — kebab "Ta bort mål"** | Wired in PR-08. ⚠ Naming: the route is `POST .../remove` while semantically it's a delete; not a V2 problem — flagged for the wider controller-naming sweep, not this plan. |

### 2.1 What's added by V2

Three new slices (PR-05 / PR-06 / PR-07):

- `PATCH  /months/{ym}/savings-goals/{id}/name`
- `PATCH  /months/{ym}/savings-goals/{id}/target-amount`
- `POST   /months/{ym}/savings-goals/{id}/transfer`

### 2.2 What's NOT in BE today and V2 also does not add

- No `SavingsBuffer` table / `Savings.MonthlyBufferTransfer` endpoint.
  PR-09 §6 keeps the bassparande row's "Sätt in extra" chip disabled
  with a `TODO(savings-buffer)`. Flagged so the next agent / iteration
  finds the gap.

### 2.3 Backend cleanup post-V2

After PR-05 through PR-10 land, the BE cleanup list is:

- **None required.** `PatchSavingsGoalsBulk` stays, the lifecycle ops
  stay, the create slice stays, the methods CRUD stays.
- Optional (out-of-scope housekeeping):
  - `POST .../savings-goals/{id}/remove` could be `DELETE
    /savings-goals/{id}` for REST consistency. **Not in V2 scope** —
    raise separately if cleanup is appetising.
  - The audit-payload field naming could be unified across the new
    slices (`SavingsGoalMutationApplier`'s `before` / `after`). Already
    follows a pattern; PR-05 / PR-06 / PR-07 must conform.

---

## 3. Frontend — full surface inventory

### 3.1 Page-level components — `Frontend/src/Pages/private/savings/`

| Component | V2 role | Cleanup |
| --- | --- | --- |
| `SavingsEditorPage.tsx`                 | **Refactor — host new modals** | Drop `SavingsGoalContributionModal` import and its `modalRow` state. Add `monthlyModalRow`, `targetDateModalRow`, `transferModalRow`, `renameModalRow`, `targetAmountModalRow`. Done across PR-08 / 09 / 10. |
| `SavingsSoulHero.tsx`                   | **Keep** | V2 hero is functionally identical. |
| `SavingsMethodsStrip.tsx` / `SavingsMethodsEditor.tsx` | **Keep** | Methods strip + modal unchanged. |
| `SavingsBaseHabitRow.tsx` / `SavingsBaseHabitDialog.tsx` | **Keep + 1 stub** | Stays; PR-09 adds a *disabled* "Sätt in extra" chip with a `TODO(savings-buffer)`. |
| `SavingsPlanBalanceStrip.tsx`           | **Keep** | Six-term breakdown stays. |
| `SavingsGoalCardsList.tsx`              | **Keep** | List shell; the row component is what changes. |
| `SavingsGoalCard.tsx`                   | **Refactor — drop "Justera" block, mount `SavingsGoalActionRow`** | PR-08 owns the rebuild. |
| `SavingsGoalDraftCard.tsx`              | **Keep** | "Lägg till sparmål" form unchanged. |
| `SavingsGoalContributionModal.tsx`      | **Delete** | PR-08 final step. |
| `SavingsGoalLifecycleConfirmDialog.tsx` | **Keep — reused by kebab Arkivera / Ta bort** | PR-08 reuses verbatim. |
| `SavingsForecastRow.tsx`                | **Keep** | Frontend-only projection retained. |
| `SavingsOldGoalsSection.tsx`            | **Keep** | "Tidigare mål" retained. |

### 3.2 Hooks — `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`

| Hook | V2 role |
| --- | --- |
| `useBudgetMonthSavingsGoals`         | Keep |
| `useBudgetMonthSavingsOldGoals`      | Keep |
| `useBudgetMonthSavingsMethods`       | Keep (also feeds the transfer modal "from-account" select) |
| `useAddBudgetMonthSavingsMethod`     | Keep |
| `useRemoveBudgetMonthSavingsMethod`  | Keep |
| `usePatchBudgetMonthSavingsGoal`     | Keep — backs both **Månadsbelopp** and **Måldatum** modals |
| `usePatchBudgetMonthSavingsGoalsBulk`| Keep on disk; **only consumer is the legacy `SavingsPanel`** (§6) |
| `useCreateBudgetMonthSavingsGoal`    | Keep |
| `useCompleteSavingsGoalMutation`     | Keep — kebab Arkivera |
| `useCancelSavingsGoalMutation`       | Keep — referenced by `SavingsGoalLifecycleConfirmDialog` |
| `usePatchBudgetMonthBaseSavings`     | Keep |
| `useRemoveSavingsGoalMutation`       | Keep — kebab Ta bort |

**New hooks added by V2:**

- `useTransferBudgetMonthSavingsGoalMutation` (PR-09)
- `useRenameBudgetMonthSavingsGoalMutation` (PR-10)
- `useChangeBudgetMonthSavingsGoalTargetAmountMutation` (PR-10)

### 3.3 API client — `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`

Symmetric with the hook table. Three new client functions added by
PR-09 / PR-10. Nothing to delete unless §6 retires the bulk path.

### 3.4 i18n

| File | V2 role |
| --- | --- |
| `SavingsEditorPage.i18n.ts` | **Keep + extend** (new action-chip + kebab labels, "Snart" hint). |
| `SavingsGoalModal.i18n.ts`  | **Delete** with `SavingsGoalContributionModal`. PR-08 owns the deletion. |
| Three new files            | `SavingsGoalMonthlyModal.i18n.ts`, `SavingsGoalTargetDateModal.i18n.ts` (PR-08), `SavingsGoalTransferModal.i18n.ts` (PR-09), `SavingsGoalRenameModal.i18n.ts`, `SavingsGoalTargetAmountModal.i18n.ts` (PR-10). |

### 3.5 Tests

- `SavingsGoalCard.test.tsx` — update for new action row (PR-08).
- `SavingsGoalContributionModal.test.tsx` — delete with the modal (PR-08).
- `SavingsEditorPage.balance.test.tsx`, `SavingsEditorPage.create.test.tsx` — both mock `usePatchBudgetMonthSavingsGoal`. Their assertions don't read the now-removed shape, but verify after PR-08 lands.

---

## 4. The legacy surface — `EditPeriodDrawer` / `SavingsPanel`

The old drawer is **still mounted on the dashboard**:

- `Frontend/src/components/organisms/pages/DashboardContent.tsx:375` —
  renders `EditPeriodDrawer`.
- `EditPeriodDrawer.tsx:120` — renders `SavingsPanel`.
- `SavingsPanel.tsx` — bulk-edits monthly contributions (only) and saves
  via `PatchSavingsGoalsBulk`. No goal-level fields, no kebab, no
  lifecycle.

This pre-dates the dedicated `Pages/private/savings/SavingsEditorPage`.
The two surfaces co-exist today. V2's design implicitly assumes the
dedicated page is the canonical surface — but does **not** say to retire
the drawer.

**Recommendation:** out-of-scope for V2 PRs. Decide separately. Options
in §6.

---

## 5. Cleanup checklist that ships INSIDE the V2 PRs

Already covered by PR-08 / 09 / 10 — re-listed here as a sanity check:

- [ ] Delete `SavingsGoalContributionModal.tsx` (PR-08).
- [ ] Delete `SavingsGoalContributionModal.test.tsx` (PR-08).
- [ ] Delete `SavingsGoalModal.i18n.ts` (PR-08).
- [ ] Drop "Justera" button from `SavingsGoalCard.tsx` (PR-08).
- [ ] Drop the contribution simulator code path & strings from any
      remaining file (PR-08 should be the only place; double-check
      `SavingsGoalCard.tsx`, `SavingsEditorPage.tsx`).
- [ ] Remove the `onLifecycleAction` lifting from the old modal — the
      kebab takes over (PR-08).
- [ ] Re-enable / un-stub `disabled` chips as PR-09 / PR-10 land. No
      "Snart" string left behind once PR-10 ships.

Nothing else to delete.

---

## 6. Decision items (need your call before / after V2)

These are NOT V2 blockers but are the natural cleanup the V2 work
surfaces. Capturing them so we don't lose them.

| # | Question | Why it matters | Suggested default |
| - | --- | --- | --- |
| **A** | Retire `EditPeriodDrawer`'s `SavingsPanel` (the bulk-edit panel) once V2 ships? | The dedicated `SavingsEditorPage` covers a strict superset of what `SavingsPanel` does, with better UX. Keeping both means two places to maintain for the same write. | Retire after V2 lands and `SavingsEditorPage` proves itself in prod. Add a follow-up PR after PR-11 (E2E). |
| **B** | If A = retire, also retire the BE `PatchSavingsGoalsBulk` slice? | Slice would have no callers. It is well-tested though. Removing it deletes meaningful integration tests. | Keep the BE slice; remove only the FE caller + hook. Bulk operations may return for a future "edit all goals" surface. |
| **C** | Build a `SavingsBuffer` table to support the V2 bassparande "Sätt in extra" chip? | Without it, the chip stays disabled forever — confusing UX. With it, you need a new mutation + new audit + new dashboard term. | Decide AFTER the goal-side V2 lands. The chip's "Snart" hint buys time. |
| **D** | Rename `POST .../savings-goals/{id}/remove` to `DELETE …/savings-goals/{id}` for REST consistency? | Out of V2 scope. Cosmetic. Touches FE + tests. | Defer to a wider controller-naming sweep PR. Not now. |

If you want any of A–D folded into the V2 plan, I can add the
corresponding PR brief.

---

## 7. Risk summary

- **Test churn at PR-08.** Deleting `SavingsGoalContributionModal` and
  rebuilding `SavingsGoalCard.tsx` invalidates a non-trivial chunk of
  test setup. PR-08 §8 enumerates the required new tests.
- **Re-read invariants.** The new BE slices (PR-05 / 06 / 07) update
  both the snapshot and the plan baseline. If the read path uses the
  snapshot's `Name` / `TargetAmount` directly (not joined to
  `SavingsGoal`), other open months will drift. PR-05 §7 and PR-06 §7
  both call out the verification step.
- **Idempotency drift.** PR-07's transfer command is the first
  non-idempotent savings mutation. PR-07 §6 #8 names it explicitly; PR-09
  §4 debounces the Save button. Two layers of defence.
- **No regression in `PatchSavingsGoalsBulk`.** Still wired, still
  covered by the existing integration test. Make sure that stays green
  through PR-08 (the FE rewires its modals but doesn't touch the bulk
  path).

---

## 8. Read in this order

1. This file.
2. `PR-V2-OVERVIEW.md` (build sequence + ground rules).
3. The individual PR brief you're implementing.
