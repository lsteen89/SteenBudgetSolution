# Savings — Bug Investigation (PR 3 blockers)

**Date:** 2026-05-23
**Branch:** `feature/PolishDashboardEditor`
**Scope:** Verify the two reported bugs that block 2/19 PR-3 E2E specs,
and sweep for adjacent bugs of the same shape. Read-only investigation —
no production code was edited.

---

## 1. Executive summary

Both reported bugs are confirmed. No adjacent bugs of the same shape were
found in the surrounding code:

- **1 FE typo bug** (Bug A) — wrong DTO path on the new `isMonthOnly` field
  introduced by PR 2.6. One consumer, one line, one-character fix.
- **1 BE off-by-one bug** (Bug B) — `upperBoundUtc` excludes goals
  completed today when "today" is in the calendar month *after* the open
  budget month. Affects every real user in the first ~weeks of any
  calendar month following an un-advanced open month, not just E2E.
- **0 new bugs found** in the same class:
  - The other `dashboardMonthQuery.data` access in the same file (line 78)
    threads through `buildDashboardSummaryAggregate`, which correctly
    unwraps `liveDashboard` ([buildDashboardSummaryAggregate.ts:62](Frontend/src/hooks/dashboard/buildDashboardSummaryAggregate.ts:62)).
    Other pages that consume the dashboard month (`debts`, `income`,
    `expenses`, `settings`) all read through the aggregate or through the
    explicit `.liveDashboard.` path. The only direct `.savings.` typo is
    line 132.
  - The four other `AddMonths(1)` callers in
    `Backend/Application/Features/Budgets/Months/` either build a
    YearMonth *string* ([CloseBudgetMonthCommandHandler.cs:420](Backend/Application/Features/Budgets/Months/CloseBudgetMonth/CloseBudgetMonthCommandHandler.cs:420),
    [GetBudgetMonthRecapQueryHandler.cs:156](Backend/Application/Features/Budgets/Months/Recap/GetBudgetMonthRecapQueryHandler.cs:156))
    or iterate over months ([YearMonthUtil.cs:62](Backend/Application/Features/Budgets/Months/Helpers/YearMonthUtil.cs:62),
    [YearMonthUtil.cs:68](Backend/Application/Features/Budgets/Months/Helpers/YearMonthUtil.cs:68))
    — none of them is used as a timestamp filter on real wall-clock
    `ClosedAt`/`OccurredAt` columns.

Severity: Bug A is FE-only and silent (orphan dialog opens with plan-scope
cards enabled until the first PATCH response comes back). Bug B is BE and
silently loses a row from the user-visible "old goals" list until the open
month is advanced — real-world impact, not just E2E.

---

## 2. Bug A — FE reads `isMonthOnly` from the wrong path

### Verified

- DTO shape: [BudgetDashboardMonthDto.ts:1-28](Frontend/src/types/budget/BudgetDashboardMonthDto.ts:1) has no top-level
  `savings` field. The savings overview lives at
  `BudgetDashboardMonthDto.liveDashboard.savings` (typed
  `SavingsOverviewDto | null` on a nullable `liveDashboard`).
- The `isMonthOnly: boolean` field is defined inside `SavingsOverviewDto`
  at [BudgetDashboardDto.ts:71](Frontend/src/types/budget/BudgetDashboardDto.ts:71) and is mirrored
  one-for-one by the BE DTO ([SavingsOverviewDto.cs:13](Backend/Application/DTO/Budget/Dashboard/SavingsOverviewDto.cs:13)).
- Wrong access site:
  [SavingsEditorPage.tsx:131-132](Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:131)
  ```ts
  const baseIsMonthOnly =
    dashboardMonthQuery.data?.savings?.isMonthOnly ?? false;
  ```
  `data?.savings` is `undefined` on every response → falls through to
  `false` → `SavingsBaseHabitDialog` always receives `isMonthOnly={false}`
  → `canUpdatePlan={true}` ([SavingsBaseHabitDialog.tsx:181](Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx:181))
  → plan-scope cards stay enabled on first open for orphan months. The
  effective default `setScope("currentMonthAndBudgetPlan")` is then
  chosen ([SavingsBaseHabitDialog.tsx:71](Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx:71)),
  which the BE will reject with `BaseSavings.PlanMissing` on submit.
- No competing top-level `savings` field exists on the dashboard month
  DTO — this is unambiguously a typo, not a partial migration.
- Only consumer of dashboard `isMonthOnly` in the FE is this file
  (other `isMonthOnly` references throughout
  `Frontend/src/**` are unrelated row-level fields on
  `BudgetMonthSavingsGoalEditorRowDto` / `BudgetMonthSavingsGoalArchiveRowDto`,
  not the dashboard overview field).

### Proposed fix

[SavingsEditorPage.tsx:131-132](Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:131):

```diff
-  const baseIsMonthOnly =
-    dashboardMonthQuery.data?.savings?.isMonthOnly ?? false;
+  const baseIsMonthOnly =
+    dashboardMonthQuery.data?.liveDashboard?.savings?.isMonthOnly ?? false;
```

### Why it's correct

`BudgetDashboardMonthDto.liveDashboard` is the only place the BE puts
`SavingsOverviewDto`, and the BE sets `IsMonthOnly = true` on the live
dashboard build path for orphan months. Both optional chains are needed:
`liveDashboard` is `null` for non-open snapshot months, and `savings` is
optional on `BudgetDashboardDto` ([BudgetDashboardDto.ts:96](Frontend/src/types/budget/BudgetDashboardDto.ts:96)).

### Test impact

- No unit test currently exercises this path. The existing
  [SavingsEditorPage.balance.test.tsx](Frontend/src/Pages/private/savings/SavingsEditorPage.balance.test.tsx)
  mocks the dashboard query and only asserts on the balance strip
  layout; it does not open the Bassparande dialog or assert disabled
  scope buttons.
- E2E: PR 3's planned `savings-base-habit-edit.spec.ts` (orphan path)
  becomes assertable after this fix — the disabled plan-scope cards will
  finally render on first open.

---

## 3. Bug B — Archive upper bound excludes goals completed today

### Verified

- Handler:
  [GetOldBudgetMonthSavingsGoalsQueryHandler.cs:55-61](Backend/Application/Features/Budgets/Months/Editor/Savings/GetOldSavingsGoals/GetOldBudgetMonthSavingsGoalsQueryHandler.cs:55)
  ```csharp
  var (year, month) = YearMonthUtil.Parse(query.YearMonth);
  var upperBoundUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);

  var rows = await _repo.GetSavingsGoalArchiveRowsAsync(
      ensured.Value.BudgetId,
      upperBoundUtc,
      ct);
  ```
- SQL: `upperBoundUtc` is the **only** mechanism filtering on
  `ClosedAt`. Both UNION branches use the same predicate
  (`AND sg.ClosedAt < @UpperBoundUtc` and
  `AND g.ClosedAt < @UpperBoundUtc`) —
  [BudgetMonthSavingsGoalMutationRepository.Sql.cs:273](Backend/Infrastructure/Repositories/Budget/Months/Editor/Savings/BudgetMonthSavingsGoalMutationRepository.Sql.cs:273)
  and [.Sql.cs:301](Backend/Infrastructure/Repositories/Budget/Months/Editor/Savings/BudgetMonthSavingsGoalMutationRepository.Sql.cs:301).
  No SQL-side clamp, no other `ClosedAt` predicate, no
  `WHERE ClosedAt < UTC_TIMESTAMP()` safety net.
- Concretely: open month `2026-04`, real wall-clock `2026-05-23`,
  goal completed today via `CompleteBudgetMonthSavingsGoalCommandHandler`
  → `SavingsGoalLifecycleApplier.ApplyToMonthGoal` sets
  `ClosedAt: nowUtc` ([SavingsGoalLifecycleApplier.cs:97](Backend/Application/Features/Budgets/Months/Editor/Savings/Lifecycle/SavingsGoalLifecycleApplier.cs:97))
  = `2026-05-23T…`. `upperBoundUtc` =
  `new DateTime(2026, 04, 01).AddMonths(1)` = `2026-05-01T00:00:00Z`.
  `2026-05-23 < 2026-05-01` is false → row is excluded from both
  branches → API returns `[]` (or just drops the new row).
- Curl evidence in the prompt matches this analysis.
- Real-world impact: any user who opens the savings editor in a calendar
  month later than their open budget month (an extremely common pattern
  early in any month) sees the same disappearance after completing a
  goal. The goal reappears only after the open month is advanced. Not
  E2E-only.

### Why the existing comment is right but the implementation is wrong

The handler comment explicitly states the upper bound exists to keep
the contract honest if the FE ever lets the user view an *earlier*
closed month — goals closed in a later month should not leak into an
earlier month's archive. That goal is correct and is already exercised
by [GetOldBudgetMonthSavingsGoalsTests.cs:225-255 — `ExcludesGoalsClosedAfterSelectedYearMonth`](tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/GetOldBudgetMonthSavingsGoalsTests.cs:225).
The bug is that the same predicate is *also* applied to the currently
open month, where "now" can legitimately be past
`firstOfNext(selectedYearMonth)`.

### Recommended fix — gate the upper bound on month status

The codebase already has the pieces needed and the integration test SUT
already wires a fake clock. The minimal, codebase-consistent fix:

1. Inject `TimeProvider` into the handler (same pattern as the lifecycle
   handler at
   [BudgetMonthSavingsGoalLifecycleHandler.cs:26](Backend/Application/Features/Budgets/Months/Editor/Savings/Lifecycle/BudgetMonthSavingsGoalLifecycleHandler.cs:26)).
2. Use the already-fetched `meta.Status` to decide:
   - If the selected month is **open**, the contract is "show everything
     closed up to now" → set `upperBoundUtc` to a future-safe value
     (`_clock.GetUtcNow().UtcDateTime.AddTicks(1)` or `DateTime.MaxValue`
     — see below).
   - If the selected month is **closed/skipped**, preserve the existing
     honest "as-of end of selected yearMonth" semantics.

[GetOldBudgetMonthSavingsGoalsQueryHandler.cs:55-56](Backend/Application/Features/Budgets/Months/Editor/Savings/GetOldSavingsGoals/GetOldBudgetMonthSavingsGoalsQueryHandler.cs:55):

```diff
-        var (year, month) = YearMonthUtil.Parse(query.YearMonth);
-        var upperBoundUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
+        // For a closed/skipped month being viewed historically, keep the
+        // honest "as-of end of selected yearMonth" upper bound so a
+        // later closure does not leak into an earlier archive. For the
+        // open month the user is editing, "now" is the right upper
+        // bound — clamping to first-of-next-month silently drops goals
+        // closed today when real wall-clock has crossed into the next
+        // calendar month.
+        var (year, month) = YearMonthUtil.Parse(query.YearMonth);
+        var isOpenMonth = string.Equals(
+            meta.Status, BudgetMonthStatuses.Open, StringComparison.OrdinalIgnoreCase);
+        var upperBoundUtc = isOpenMonth
+            ? _clock.GetUtcNow().UtcDateTime.AddTicks(1)
+            : new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
```

(`BudgetMonthStatuses.Open` already exists at
[BudgetMonthConstants.cs:5](Backend/Application/Constants/BudgetMonthConstants.cs:5);
the open/non-open check uses the same `OrdinalIgnoreCase` style as
[PatchBudgetMonthExpenseItemsBulkCommandHandler.cs:66](Backend/Application/Features/Budgets/Months/Editor/Expense/PatchExpenseItemsBulk/PatchBudgetMonthExpenseItemsBulkCommandHandler.cs:66).)

The clock injection is one ctor parameter and one field — exact same
shape as the lifecycle handler.

### Why pick this shape over the alternatives

- "Clamp to `max(firstOfNext, utcNow)` unconditionally" breaks the
  existing `ExcludesGoalsClosedAfterSelectedYearMonth` test: on
  `2026-03-07` viewing the `2026-01` archive, `utcNow` (Mar 7) > Feb 1,
  so a goal closed `2026-03-04` would leak into January's archive.
- "Push the SQL filter to `<= UTC_TIMESTAMP()`" works for today's
  always-current-open-month FE but loses the honest contract the
  comment is protecting, and forces the SQL to know about wall-clock,
  which the rest of this slice avoids.
- The status-gated approach preserves the original intent and only
  relaxes the bound in the one case where it is wrong.

### Test impact

- Existing tests in
  [GetOldBudgetMonthSavingsGoalsTests.cs](tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/GetOldBudgetMonthSavingsGoalsTests.cs)
  should keep passing:
  - The `ExcludesGoalsClosedAfterSelectedYearMonth` test materializes
    January and views January's archive (`2026-01`). That month's
    status after materialization will be the latest-opened month →
    January is not the open month in March 7 → keeps the original
    upper bound → still excludes the March-closed row.
  - Worth verifying: confirm `EnsureMonthAsync` /
    `EnsureAccessibleMonthAsync` keeps `meta.Status` of an
    earlier month as `closed` (not `open`) when a later month has
    been opened. If the integration helper leaves January as `open`,
    the assertion in that test would change shape — add a quick
    inspection step when applying the fix. (Spot-checked the seeds:
    nothing in this handler's path mutates the status, so behaviour
    depends on the seed scenario.)
- New tests to add (one each, both at the integration layer in the
  same file):
  1. `IncludesGoalsCompletedTodayWhenViewingOpenMonth` — open month
     `2026-04`, fake `utcNow = 2026-05-23`, complete a goal, GET
     `/savings-goals/old` for `2026-04`, expect the just-completed row
     to be present.
  2. `IncludesGoalsCompletedTodayWhenOpenMonthEqualsCurrentMonth` —
     same shape but with open month equal to the calendar month of
     `utcNow`, to guarantee the new clamp doesn't accidentally drop
     valid rows in the easy case.
- `Backend.Tests/UnitTests/**` does not currently cover this handler;
  no unit-test churn required.
- E2E: PR 3's `savings-goal-complete-archive.spec.ts` (or whichever
  spec asserts "active count drops by one *and* archive count rises by
  one" — name per `Work/Dashboard/savings/PR-03-savings-e2e.md`)
  becomes green once this lands.

---

## 4. Adjacent bugs found

**None.**

Sweep performed:

- `grep -rn "\.data\?\.savings\.\|\.data\.savings\.\|MonthQuery\.data" Frontend/src/`
  — all other call sites either run through
  `buildDashboardSummaryAggregate` (which unwraps `liveDashboard`
  correctly) or use the explicit `liveDashboard.` chain
  ([SettingsPage.tsx:134](Frontend/src/Pages/private/settings/SettingsPage.tsx:134)).
- `grep -rn "isMonthOnly" Frontend/src/` — only [SavingsEditorPage.tsx:132](Frontend/src/Pages/private/savings/SavingsEditorPage.tsx:132)
  reads `isMonthOnly` from the dashboard query. Every other
  `isMonthOnly` reference is the unrelated row-level field on goal /
  expense / debt editor rows.
- `grep -rn "AddMonths(1)" Backend/` — five hits total; only the
  `GetOldBudgetMonthSavingsGoalsQueryHandler` one is used as a
  timestamp filter on a real wall-clock column. The other four either
  build a `yyyy-MM` string or iterate over months.
- Broader sweep for "first-of-next-month timestamp upper bound" via
  `ClosedAt`, `UpperBound`, `< @`, etc. across
  `Backend/Application/Features/Budgets/Months/` — no other handler
  fits the pattern. The other `ClosedAt` references are either
  field carriers on DTOs / read models / write models or use
  `nowUtc` directly for writes.

---

## 5. Test impact summary

| Test | Action | Why |
| --- | --- | --- |
| [tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/GetOldBudgetMonthSavingsGoalsTests.cs](tests/Backend.IntegrationTests/Budget/BudgetMonths/Editor/GetOldBudgetMonthSavingsGoalsTests.cs) — `CreateSut(...)` | Update to inject the new `TimeProvider` ctor parameter on `GetOldBudgetMonthSavingsGoalsQueryHandler`. | Compilation. The SUT already creates a `FakeTimeProvider` and threads it elsewhere; reuse the same `time` local. |
| Same file | Add `IncludesGoalsCompletedTodayWhenViewingOpenMonth` integration test. | Regression coverage for Bug B. |
| Same file | (Optional) Add `IncludesGoalsCompletedTodayWhenOpenMonthEqualsCurrentMonth`. | Easy-case parity. |
| [Frontend/src/Pages/private/savings/SavingsEditorPage.balance.test.tsx](Frontend/src/Pages/private/savings/SavingsEditorPage.balance.test.tsx) | No change needed for Bug A (test does not open the dialog). | The fix only affects the dialog scope-card prop. |
| New FE unit test (optional, suggested) | A small render test that mounts `SavingsEditorPage` with a dashboard query stub where `liveDashboard.savings.isMonthOnly = true`, opens the Bassparande dialog, asserts plan-scope cards are disabled. | Prevents future regressions of the same typo. |
| E2E (`Frontend/e2e/savings/...`) | Re-enable the two paused PR-3 specs once both fixes land. | They were paused because of these two bugs. |

---

## 6. Suggested fix order

**One PR — both bugs land together.** Rationale:

- Both bugs were introduced or surfaced by the same PR-3 prep work and
  block the same two specs.
- The FE fix is one line; the BE fix is ~10 lines plus a ctor wire-up
  and two integration tests. Splitting them adds review overhead with
  no real risk reduction.
- Neither change touches auth, lifecycle command flow, or
  transactional code — both are read-path adjustments.
- Suggested commit shape (two commits, one PR):
  1. `fix(savings): read isMonthOnly from liveDashboard, not the
     dashboard month root`
  2. `fix(savings): include goals closed today when viewing the open
     month`

There is no ordering constraint between the two fixes. Land the BE
commit first if you want the new integration test green before the
E2E specs are re-enabled, but either order works.

No blockers on PR 3 once both land: the previously paused
`savings-base-habit-edit.spec.ts` (orphan path) and the
`savings-goal-complete-archive.spec.ts` (or equivalent) become
assertable.
