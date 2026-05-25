# PR 10 — Kebab: Byt namn + Ändra målbelopp focused modals (frontend)

| | |
| --- | --- |
| **Type** | Frontend wiring — two small focused modals + two new mutation hooks. |
| **Depends on** | PR 05 (rename endpoint) + PR 06 (target-amount endpoint) + PR 08 (kebab scaffolding). |
| **Blocks** | PR 11 (E2E). |
| **Risk** | Low — two CRUD-shape modals over already-stable endpoints. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

PR-08 left two kebab items disabled with "Snart": **Byt namn** and
**Ändra målbelopp**. PR-05 ships the rename endpoint and PR-06 ships the
target-amount endpoint. This PR enables both kebab items and builds the
two small focused modals.

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`**.
- **`Work/Dashboard/savings/PR-05-be-rename-goal.md`** — request/response.
- **`Work/Dashboard/savings/PR-06-be-change-goal-target-amount.md`** —
  request/response + the `TargetBelowSaved` error code.
- **`/tmp/design-bundle/ebudget-design-system/project/explorations/savings/MVP-Savings v2.html`** —
  V2's kebab markup at lines ~1711–1720; the modals reuse the same
  `dialog` shell + `dialog-section` pattern as the Månadsbelopp /
  Måldatum modals.

## 3. Scope

**In:**

1. `SavingsGoalRenameModal` — single text input (`row.name`), Save +
   Cancel. Submits `{ name }`. Disables Save while in flight; closes on
   success + invalidates the goals + dashboard queries.
2. `SavingsGoalTargetAmountModal` — `MoneyInput` (`row.targetAmount`),
   snapshot dl. Inline validation: `targetAmount > 0`,
   `targetAmount >= row.amountSaved` (mirrors BE `TargetBelowSaved`).
   Submits `{ targetAmount }`.
3. Two new mutation hooks:
   `useRenameBudgetMonthSavingsGoalMutation(yearMonth)` and
   `useChangeBudgetMonthSavingsGoalTargetAmountMutation(yearMonth)`.
4. Wire `onRename` and `onChangeTarget` on `SavingsGoalActionRow` (kebab
   items) to open the modals.

**Out:**

- E2E (PR-11).
- BE changes — already shipped by PR-05 / PR-06.
- Renaming via inline-edit on the card name — explicit modal only, per
  V2.

## 4. Modal contracts

**Rename modal**

| | |
| --- | --- |
| **Component** | `SavingsGoalRenameModal.tsx` |
| **Endpoint** | `PATCH …/savings-goals/{id}/name` |
| **Snapshot** | Minimal — just the goal name + a short helper. |
| **Validation** | Trim; `name.length >= 1`, `<= 255`. Reuse the validator pattern from `CreateSavingsGoalDraftCard`. |
| **i18n** | `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalRenameModal.i18n.ts`. |

**Target-amount modal**

| | |
| --- | --- |
| **Component** | `SavingsGoalTargetAmountModal.tsx` |
| **Endpoint** | `PATCH …/savings-goals/{id}/target-amount` |
| **Snapshot** | 3-cell dl (saved / target / deadline) — reuse `SnapshotCell` from PR-08. |
| **Input** | `MoneyInput` (number, ≥ saved, ≤ 10_000_000). |
| **Outcome line** | "Med <strong>X kr/mån</strong> når du målet om <strong>Y mån</strong>" — pure FE math from the new target and the existing `monthlyContribution`. |
| **i18n** | `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTargetAmountModal.i18n.ts`. |

Both modals: Save disabled while mutation in flight; closes on success;
invalidates `useBudgetMonthSavingsGoals` and `useBudgetDashboardMonthQuery`
for the active `yearMonth` (dashboard pulls totals from the goal data).

## 5. Files to touch

**New:**

- `Frontend/src/Pages/private/savings/components/SavingsGoalRenameModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalRenameModal.test.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalTargetAmountModal.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsGoalTargetAmountModal.test.tsx`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalRenameModal.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/savings/SavingsGoalTargetAmountModal.i18n.ts`

**Modified:**

- `Frontend/src/api/dashboard/monthEditor/savings.ts` — two new client
  functions.
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts` — two new
  mutation hooks.
- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx` — host the
  two new modals.
- `Frontend/src/Pages/private/savings/components/SavingsGoalActionRow.tsx` —
  enable `onRename` + `onChangeTarget`; drop the "Snart" hints from
  the two kebab items.

## 6. Tests

- Both modals: render, validate, submit happy path, BE-error path
  (mock hook reject — `TargetBelowSaved` etc.).
- Rename trims whitespace; empty submission blocked.
- Target-amount input below saved → inline error, no mutation call.
- Save button disabled during in-flight mutation.
- `SavingsEditorPage` integration: kebab → Byt namn → save → rename
  mutation called; kebab → Ändra målbelopp → save → target-amount
  mutation called; both modals close on success.

## 7. Validation

- `npm run build` and `npx vitest --project unit run` — all green.
- Local browser pass:
  - Kebab on a goal card → Byt namn → save → name updates on the card
    without reload.
  - Kebab → Ändra målbelopp → save → progress bar % updates (the
    denominator moved); balance strip unchanged.
  - Inline validation surfaces before the BE round-trip.

## 8. After the task

Changelog + `COMMIT_MSG.tmp`
(`feat(savings): wire goal rename + change-target-amount kebab modals`),
then stop.
