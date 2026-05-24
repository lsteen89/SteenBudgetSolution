# PR 2.9 — Unit test: Bassparande dialog disables plan-scope cards on orphan

| | |
| --- | --- |
| **Type** | New FE unit test — regression guard for the Bug A typo class |
| **Depends on** | PR 2.8 (the fix that made the orphan path actually disable plan-scope cards) |
| **Blocks** | Nothing |
| **Risk** | None — test code only |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

PR 2.8 fixed two bugs that PR 3's E2E suite caught. One of them (Bug A) was
a one-character typo: `SavingsEditorPage.tsx` read `isMonthOnly` from
`dashboardMonthQuery.data?.savings?.isMonthOnly` instead of
`data?.liveDashboard?.savings?.isMonthOnly`. The fix shipped, but **the only
regression guard now is the E2E orphan spec**. A fast unit-level test that
mounts `SavingsEditorPage`, points the dashboard query at an orphan-shaped
response, opens the Bassparande dialog, and asserts the plan-scope cards
are disabled would catch a recurrence in milliseconds instead of in a slow
Playwright run.

PR 2.8's brief listed this as optional (§4.2); the implementing agent
acknowledged in the changelog that they skipped it. This PR closes that gap.

## 2. Read first

- **`Work/Dashboard/savings/SAVINGS-BUGS-INVESTIGATION.md`** — §2 explains
  the dto path and the exact prop that gates `<EditScopeRadioCards>`.
- **`Work/Dashboard/savings/PR-2.8-fix-savings-bugs.md`** — §4.2 is the
  scope of this test, verbatim.
- **`Frontend/src/Pages/private/savings/SavingsEditorPage.balance.test.tsx`
  and `…SavingsEditorPage.create.test.tsx`** — the existing test patterns
  for this page: how the dashboard query is stubbed, how `react-query`'s
  `QueryClient` is wired, how the locale + tokens render. **Mirror these.**
- **`docs/ai/ai-changelog.md`** — recent entries for what PRs 2.5 / 2.6 /
  2.7 / 2.8 actually shipped.

## 3. What to add

Add **one** test. Pick the file based on what's smallest:

- If `SavingsEditorPage.create.test.tsx` already mounts the page in a way
  that opens the dialog (or has helpers for it), add a sibling test there.
- Otherwise, create a new file
  `Frontend/src/Pages/private/savings/SavingsEditorPage.baseHabit.test.tsx`
  with one focused test.

### Test shape

```
test("Bassparande dialog disables plan-scope cards when orphan", async () => {
  // 1. Render <SavingsEditorPage /> with the QueryClient stub used in the
  //    sibling tests. The stub must return a dashboard month response with
  //    liveDashboard.savings.isMonthOnly === true, savings.monthlySavings
  //    populated, and SourceSavingsId null (mirror the orphan shape the BE
  //    sends — confirm by reading BudgetDashboardMonthDto + SavingsOverviewDto).
  // 2. Click the bassparande edit action (testid: savings-base-habit-edit-action).
  // 3. Assert:
  //    - savings-base-habit-scope-currentMonthOnly is enabled.
  //    - savings-base-habit-scope-currentMonthAndBudgetPlan is disabled.
  //    - savings-base-habit-scope-budgetPlanOnly is disabled.
  // 4. (Optional) Assert the disabled-plan hint copy is visible.
});
```

Plus a **second** test for the inverse (plan-linked happy path) so the
asserts have a meaningful negative case:

```
test("Bassparande dialog enables all scope cards when plan-linked", async () => {
  // Same shape, but liveDashboard.savings.isMonthOnly === false.
  // All three scope-card testids are enabled.
});
```

Two tests, ~40 lines total. Resist any temptation to grow this into a full
dialog-coverage suite — PR 3's E2E already exercises the full lifecycle.

## 4. What NOT to do

- Do **not** edit production code in `Frontend/src/Pages/private/savings/`
  beyond what `npm run lint --fix` does automatically. The component
  behaviour is already correct.
- Do **not** introduce a new test runner, mock library, or render helper.
  Mirror exactly what the sibling tests use (vitest + RTL + the existing
  query stubs).
- Do **not** add E2E selectors that don't exist on the actual rendered
  component — the testids listed in §3 are confirmed present in the
  `SAVINGS-WIRING-AUDIT.md` §5 inventory.
- Do **not** touch BE code, auth, Docker, Caddy, or CI.

## 5. Acceptance criteria

- One new test file (or two new tests in `…create.test.tsx`).
- `npm test -- SavingsEditorPage --run` passes; the new tests are visible
  in the output and pass.
- If the production typo from Bug A is reverted, the orphan test **fails**.
  (Sanity-check by reverting `SavingsEditorPage.tsx:132` locally — both
  asserts should flip. Restore the fix before committing.)
- No production code change beyond formatting / lint.

## 6. Validation

```
cd Frontend && npm test -- SavingsEditorPage --run
cd Frontend && npm run build
```

## 7. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, validation results).
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `test(savings): cover Bassparande dialog orphan / plan-linked scope gating`.
3. Stop. Do not commit or push.
