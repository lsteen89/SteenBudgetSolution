# PR 2.8 — Fix two pre-existing savings bugs blocking PR 3

| | |
| --- | --- |
| **Type** | Two bug fixes — one FE typo, one BE off-by-one (read-path only) |
| **Depends on** | PR 1 + PR 2 + PR 2.5 + PR 2.6 + PR 2.7 (in working tree) |
| **Blocks** | PR 3 — re-enables 2 of the 19 full-project specs that are paused on these bugs |
| **Risk** | Low — both are read-path adjustments. No auth, no lifecycle, no transactional surface. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

PR 3 (Playwright E2E) ran 17/19 green. The two remaining failures are
**pre-existing bugs** — not new regressions, not test problems. Both have
real-world impact beyond E2E:

- **Bug A (FE typo):** `SavingsEditorPage.tsx:132` reads `isMonthOnly` from
  the wrong dashboard path, so the Bassparande dialog never disables
  plan-scope cards on first open for orphan months. The BE catches the
  resulting bad write with `BaseSavings.PlanMissing`, but the UI is silently
  wrong until then.
- **Bug B (BE off-by-one):** `GetOldBudgetMonthSavingsGoalsQueryHandler.cs:56`
  clamps the archive upper bound to first-of-next-month. When real wall-clock
  has crossed into the calendar month *after* the open budget month, a goal
  completed today silently vanishes from "Tidigare mål" until the user
  advances the open month.

The investigation in `Work/Dashboard/savings/SAVINGS-BUGS-INVESTIGATION.md`
confirmed both, swept for adjacent bugs of the same shape (none found), and
picked the codebase-consistent fix for each.

## 2. Read first (mandatory)

- **`Work/Dashboard/savings/SAVINGS-BUGS-INVESTIGATION.md`** — your primary
  brief. Every diff below is justified there with file:line evidence,
  rejected alternatives, and the test-impact analysis. **Do not implement
  before reading it.** If you find yourself disagreeing with a design call
  in the report, stop and raise it — the design space was already explored
  in writing.
- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** — context for how
  PR 2.5 / 2.6 / 2.7 closed the FE wiring gap; Bug A is debris from PR 2.6.
- **`Work/Dashboard/savings/PR-03-savings-e2e.md`** — the specs this PR
  unblocks. §7.2 (orphan path) and §7.3 (goal-lifecycle archive assertion).
- **`docs/ai/ai-changelog.md`** — recent entries for what PR 1 / 2 / 2.5 /
  2.6 / 2.7 actually shipped.
- The committed-but-unpushed code referenced below is the source of truth —
  read each file before editing it.

## 3. Commit shape — one PR, two commits

The two bugs are independent. Land them as two atomic commits so each diff
is reviewable on its own. There is no ordering constraint; the order below
is suggested (BE first means the new integration test is green before the
E2E specs are re-enabled).

### Commit 1 — `fix(savings): include goals closed today when viewing the open month`

**File:** `Backend/Application/Features/Budgets/Months/Editor/Savings/GetOldSavingsGoals/GetOldBudgetMonthSavingsGoalsQueryHandler.cs`

Apply the diff from investigation §3 (recommended fix):

1. Inject `TimeProvider` via the constructor — mirror exactly
   `BudgetMonthSavingsGoalLifecycleHandler.cs:26` (same DI pattern, same
   field naming).
2. Replace the unconditional `upperBoundUtc` calculation at lines 55–56
   with a `meta.Status`-gated version:
   - **Open month** → `_clock.GetUtcNow().UtcDateTime.AddTicks(1)`
   - **Anything else** → preserve the existing
     `new DateTime(year, month, 1, …).AddMonths(1)` (the honest
     "as-of end of selected yearMonth" semantics).
3. Use `BudgetMonthStatuses.Open` (`Backend/Application/Constants/BudgetMonthConstants.cs:5`)
   with `StringComparison.OrdinalIgnoreCase`, matching the comparison
   style at `PatchBudgetMonthExpenseItemsBulkCommandHandler.cs:66`.

Keep the existing comment above the calculation honest — extend it (see
investigation §3 for the wording) so the *next* developer understands why
the bound is conditional.

**Why this shape and not the alternatives.** The investigation report
rejects (a) unconditional `Math.Max(firstOfNext, utcNow)` because it
breaks the existing `ExcludesGoalsClosedAfterSelectedYearMonth` integration
test, and (b) pushing the clamp into SQL because it loses the honest
as-of contract and forces SQL to know about wall-clock. The status-gated
approach preserves the original intent and only relaxes the bound where
it is wrong.

### Commit 2 — `fix(savings): read isMonthOnly from liveDashboard, not the dashboard month root`

**File:** `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:131-132`

```diff
-  const baseIsMonthOnly =
-    dashboardMonthQuery.data?.savings?.isMonthOnly ?? false;
+  const baseIsMonthOnly =
+    dashboardMonthQuery.data?.liveDashboard?.savings?.isMonthOnly ?? false;
```

Both optional chains are needed: `liveDashboard` is `null` for non-open
snapshot months, and `savings` is optional on `BudgetDashboardDto`. See
investigation §2 for the dto-path evidence.

This is a one-character class of bug — do not refactor anything else in
the file while you are in there. Resist the urge to "tidy" the surrounding
code; the surrounding code is fine.

## 4. Tests

### 4.1 Required — backend (commit 1)

`tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/GetOldBudgetMonthSavingsGoalsTests.cs`

1. **Update the SUT factory** (`CreateSut(...)` or equivalent) to pass the
   new `TimeProvider` ctor parameter. The fixture already creates a
   `FakeTimeProvider` and threads it into other handlers — reuse that
   instance. Mirror exactly how
   `BudgetMonthSavingsGoalLifecycleHandler` is wired in the same test
   project.
2. **Add `IncludesGoalsCompletedTodayWhenViewingOpenMonth`** — open month
   `2026-04`, fake `utcNow = 2026-05-23`, complete a goal, GET
   `/savings-goals/old` for `2026-04`, expect the just-completed row to be
   present (id match, `ClosedAt` populated).
3. **Add `IncludesGoalsCompletedTodayWhenOpenMonthEqualsCurrentMonth`** —
   same shape but with open month equal to the calendar month of `utcNow`.
   Guards against the new clamp accidentally dropping valid rows in the
   easy case.
4. **Confirm `ExcludesGoalsClosedAfterSelectedYearMonth` still passes
   unchanged.** Investigation §3 spot-checked the seeds: nothing in this
   handler's path mutates the status of an earlier month, so January
   stays `closed` (not `open`) when March is viewed, and the original
   bound still applies. If the test now needs a tweak to keep that
   property, that is a yellow flag — pause and raise it in the PR
   description before "fixing" the test.

### 4.2 Optional — frontend (commit 2)

The existing `SavingsEditorPage.balance.test.tsx` does not open the
Bassparande dialog and needs no change.

**Suggested but not required:** a small render test in
`SavingsEditorPage.create.test.tsx` (or a new sibling file) that mounts the
page with a dashboard query stub where `liveDashboard.savings.isMonthOnly`
is `true`, opens the Bassparande dialog, asserts the plan-scope cards are
disabled. This is the unit-level guard that would have caught the typo;
adding it is a real regression-prevention win.

If you skip it, the E2E orphan path is the only thing keeping the typo
from recurring — note that explicitly in the changelog so we know.

## 5. What NOT to do

- Do **not** change the SQL in
  `BudgetMonthSavingsGoalMutationRepository.Sql.cs`. The investigation
  rejects pushing the clamp into SQL — read §3's "Why pick this shape"
  before considering it.
- Do **not** fold the FE and BE fixes into one commit. Keep the two
  commits atomic.
- Do **not** refactor `GetOldBudgetMonthSavingsGoalsQueryHandler.cs`
  beyond the documented diff. No "while I'm here" cleanup.
- Do **not** change `BudgetDashboardMonthDto.ts` or any DTO shape — the
  shape is correct; only the consumer was wrong.
- Do **not** touch goals, methods, archive writes, lifecycle, auth,
  Docker, Caddy, or CI.
- Do **not** delete or weaken the
  `ExcludesGoalsClosedAfterSelectedYearMonth` test. If it fails after
  your change, the change is wrong — investigate, do not bend the test.

## 6. Acceptance criteria

- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:132` reads
  `dashboardMonthQuery.data?.liveDashboard?.savings?.isMonthOnly`. Manual
  smoke against an orphan user: open Bassparande dialog on first load →
  plan-scope cards are disabled (no save required to learn the orphan
  state).
- `GetOldBudgetMonthSavingsGoalsQueryHandler` injects `TimeProvider` and
  the upper bound is conditional on `meta.Status`.
- `dotnet build` succeeds. The integration test suite in
  `GetOldBudgetMonthSavingsGoalsTests.cs` passes — the existing
  `ExcludesGoalsClosedAfterSelectedYearMonth` test still passes
  **unchanged**, plus the two new tests are green.
- `npm run build` succeeds; existing FE unit tests pass.
- PR 3's previously paused full-project specs
  (`savings-base-habit-edit.spec.ts` orphan path and
  `savings-goal-lifecycle.spec.ts` archive assertion — names per
  `PR-03-savings-e2e.md`) now pass. Final tally: 19/19.

## 7. Validation

```
cd Backend && dotnet build
cd Backend && dotnet test --filter FullyQualifiedName~GetOldBudgetMonthSavingsGoals
cd Frontend && npm run build
cd Frontend && npm run test -- SavingsEditorPage
```

Then re-run PR 3's E2E suites against a live backend:

```
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d db
cd Frontend && npm run test:e2e:smoke      # still 8/8
cd Frontend && npm run test:e2e:full       # now 19/19
```

If anything other than the two previously failing specs changes status,
stop and report — it means one of these fixes had a side effect.

## 8. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, validation results, risks / follow-up).
2. Write the commit message to `COMMIT_MSG.tmp`. Since this PR is two
   commits, write both — separated by a blank line and a `---` divider so
   the human reviewer can pick them apart:

   ```
   fix(savings): include goals closed today when viewing the open month

   <body explaining the bound was excluding today's closures when wall-clock
    has crossed into the next calendar month; status-gated fix preserves the
    honest "as-of" contract for closed months>

   ---

   fix(savings): read isMonthOnly from liveDashboard, not the dashboard month root

   <one-line body — typo from the PR 2.6 wiring; orphan dialog never disabled
    plan-scope cards on first open>
   ```

3. Stop. Do not commit or push.
