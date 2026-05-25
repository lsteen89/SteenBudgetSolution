# PR 09 — Engångsöverföring modal (deposit / withdraw) — frontend

| | |
| --- | --- |
| **Type** | Frontend wiring — new focused modal backed by the new transfer endpoint. |
| **Depends on** | PR 07 (transfer endpoint) + PR 08 (action chips host the trigger). |
| **Blocks** | PR 11 (E2E will cover deposit + withdraw flows). |
| **Risk** | Medium — first FE surface that calls a non-idempotent BE command. Debounce the Save button. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

V2's primary chip on each goal card is **"Sätt in"**. PR-08 left it
`disabled` with a "Snart" hint. This PR enables it, builds the focused
**Engångsöverföring** modal, and wires it to the
`POST …/savings-goals/{id}/transfer` endpoint that PR-07 ships.

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`** — context + rules.
- **`Work/Dashboard/savings/PR-07-be-goal-one-time-transfer.md`** —
  request/response shape, error codes, idempotency note.
- **`/tmp/design-bundle/ebudget-design-system/project/explorations/savings/MVP-Savings v2.html`** —
  modal markup at lines ~2063–2142; interaction logic at lines
  ~2425–2510.
- **`Frontend/src/Pages/private/savings/components/SavingsGoalActionRow.tsx`** —
  PR-08's scaffolded chip. Enable, drop the `disabled` + "Snart" branch.
- **`Frontend/src/Pages/private/savings/components/SavingsBaseHabitRow.tsx`** —
  the bassparande row. V2 puts the same "Sätt in extra" chip here.
  PR-09 keeps that chip *disabled* with a "Snart" hint (see §6).

## 3. Scope

**In:**

1. `SavingsGoalTransferModal` component (deposit / withdraw direction
   toggle, big amount input, source/counter-account select, snapshot,
   outcome line).
2. New React-Query mutation hook
   `useTransferBudgetMonthSavingsGoalMutation(yearMonth)` in
   `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts` (mirror
   `usePatchBudgetMonthSavingsGoal`).
3. Wire the action row's `onDeposit` → modal open.
4. Map BE error codes (`WithdrawalBelowZero`, `SourcePlanNotFound`,
   `MonthIsClosed`, …) to localized form-level toasts.
5. Tests for the modal + the new hook.

**Out:**

- Habit/buffer transfer (no BE; chip stays disabled — see §6).
- Source-account taxonomy from a BE list. For V0 the source `select` is
  a static client list backed by the methods strip
  (`useBudgetMonthSavingsMethods`) — the BE does not yet persist a
  per-transfer counter-account. The chosen value goes in the `note`
  field with a structured prefix `"counterAccount: <name>"`.
- E2E (PR-11).

## 4. Modal contract (precise)

| Field | Source | Submit |
| --- | --- | --- |
| `direction` | toggle, default `deposit` | `direction` |
| `amount` | big input, parsed via `parseMoneyInput` | `amount` |
| `note` | derived: `counterAccount: <source>` (+ optional user note) | `note` |
| `source/counter-account` | `useBudgetMonthSavingsMethods` | persisted only in `note` |

Outcome line (FE math, mirrors V2's `recomputeTransfer`):

- **Deposit:** "Sparat blir <strong>X kr</strong> (Y % av målet) ·
  <strong>Z kr</strong> kvar."
- **Withdraw:** "Sparat blir <strong>X kr</strong> · <strong>Z kr</strong>
  kvar till målet."
- When the withdraw would push `AmountSaved` below zero, surface the
  warning inline **before** the user hits Save (mirrors BE
  `WithdrawalBelowZero` gate to avoid a round-trip on a known bad
  value).

Save button:

- Debounce: disable for the duration of the in-flight mutation
  (`isLoading` from the hook). Pattern: copy `disabled={isSaving}` from
  `SavingsGoalContributionModal` (now deleted) or
  `SavingsBaseHabitDialog`.
- Closes on success. Invalidates the savings goals query +
  dashboard-month query so the card and the balance strip update
  without a reload.
- Closes on Escape only when the form is clean.

i18n: new dict file
`Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTransferModal.i18n.ts`.

## 5. Hook + API client

`useTransferBudgetMonthSavingsGoalMutation` calls a new function in the
month-editor API module (mirror `patchBudgetMonthSavingsGoal`):

```ts
transferBudgetMonthSavingsGoal({
  yearMonth, monthSavingsGoalId,
  amount, direction, note,
})
// → POST /api/budget/months/{yearMonth}/savings-goals/{id}/transfer
//   → ApiEnvelope<BudgetMonthSavingsGoalEditorRowDto>
```

Decode the envelope identically to `patchBudgetMonthSavingsGoal`. On
success, invalidate:

- `useBudgetMonthSavingsGoals` for the active `yearMonth`.
- `useBudgetDashboardMonthQuery` for the active `yearMonth`.

## 6. Habit row "Sätt in extra"

V2's design has the chip on the bassparande row open the same modal in a
*buffer* mode. We do not have a buffer balance on the BE (`PR-07 §7`).
For this PR:

- Keep the chip on `SavingsBaseHabitRow` rendered but `disabled` with
  the same "Snart" hint pattern PR-08 introduced.
- Add a top-level `// TODO(savings-buffer)` comment naming the missing
  endpoint (`Savings.MonthlyBufferTransfer`) and the missing data
  model (`SavingsBuffer` table) so the next agent finds it.
- Do not stub a parallel hook for the habit context.

## 7. Files to touch

**New:**

- `Frontend/src/Pages/private/savings/components/SavingsGoalTransferModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalTransferModal.test.tsx`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTransferModal.i18n.ts`

**Modified:**

- `Frontend/src/api/dashboard/monthEditor/savings.ts` (or whichever
  module hosts `patchBudgetMonthSavingsGoal` today — find and mirror
  exactly).
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts` — add the
  new mutation hook.
- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx` — wire
  `onDeposit` to open the modal.
- `Frontend/src/Pages/private/savings/components/SavingsGoalActionRow.tsx` —
  enable the chip; remove the "Snart" branch.
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitRow.tsx` —
  keep chip disabled with the documented `TODO(savings-buffer)`.

## 8. Tests

- Modal render: snapshot + direction toggle + amount + source select.
- Deposit with valid amount → mutation called with correct payload.
- Withdraw with amount > `AmountSaved` → inline warning visible, Save
  disabled.
- Save button disables for the duration of the in-flight mutation.
- BE failure (mock the hook to reject with `WithdrawalBelowZero`) →
  localized toast, modal stays open, fields preserved.
- Closes + invalidates queries on success.

## 9. Validation

- `npm run build` and `npx vitest --project unit run` — all green.
- Local browser pass against the dev DB:
  - Sätt in 1 000 kr → snapshot updates, balance strip updates.
  - Ta ut 200 kr → snapshot decremented.
  - Ta ut more than `AmountSaved` → blocked inline + by BE.
  - Mutation surface visibly disables Save while in flight (no
    double-clicks possible).

## 10. After the task

Changelog + `COMMIT_MSG.tmp`
(`feat(savings): wire one-time goal transfer modal to backend`), then
stop.
