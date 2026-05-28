# PR 2 — Bassparande base-savings editor slice

| | |
| --- | --- |
| **Type** | New feature slice (command + repo + endpoint + tests) |
| **Depends on** | PR 1 (the endpoint lands in `BudgetController.Editor.Savings.cs`) |
| **Risk** | Medium — financial write, lifecycle-aware, scope-aware |
| **Branch** | current branch — do not branch/worktree |

---

## 1. Why this PR exists

The Savings MVP frontend (`docs/ai/savings-mvp-report.md` §4.1) shipped a fully
built **Bassparande adjust dialog** (`SavingsBaseHabitDialog`) with **no backend
behind it**. On save it currently:

- logs `console.info("[savings-mvp] update Savings.MonthlySavings", ...)`,
- stores the value in session-local React state (`baseMonthlyOverride`),
- the value is lost on reload / month change.

This PR builds the missing command so base monthly savings edits **persist**.

**Read `docs/ai/savings-mvp-report.md` §2, §4.1, §6 before starting.** §2
explains why base savings and goal savings must stay reconciled; do not change
any total formula.

## 2. What "base savings" is

"Base savings" / "Bassparande" = the user's plain monthly savings habit,
**separate from goal contributions**. It is stored as a single scalar:

- `Savings.MonthlySavings` — the **plan baseline** (one row per budget).
- `BudgetMonthSavings.MonthlySavings` — the **per-month materialized value**.

The dashboard reads `BudgetMonthSavings.MonthlySavings` for the open month
(`BudgetMonthDashboardRepository.sql.cs`). So editing the current month must
write `BudgetMonthSavings.MonthlySavings`; editing the plan must write
`Savings.MonthlySavings`.

> Do **not** confuse this with goal contributions — those live in
> `BudgetMonthSavingsGoal` / `SavingsGoal` and already have their own slices.
> This PR touches only the base-savings scalar.

## 3. Pattern to mirror

Copy the shape of the existing **savings-goal patch** slice — it is the closest
analogue (scope-aware, lifecycle-aware, audited):

```
Backend/Application/Features/Budgets/Months/Editor/Savings/PatchSavingsGoal/
  PatchBudgetMonthSavingsGoalCommand.cs
  PatchBudgetMonthSavingsGoalCommandValidator.cs
  PatchBudgetMonthSavingsGoalCommandHandler.cs
  SavingsGoalMutationApplier.cs
```

Also inspect `Editor/Income/PatchIncomeItem/` — income is a single scalar amount
edited with the same three scopes; its handler structure is the most direct
template for a scalar (non-row) edit.

## 4. The three scopes

Reuse the existing scope constants/helpers the goal patch uses —
`BudgetMonthSavingsGoalEditScopes` (`IsSupported`, `WritesCurrentMonth`,
`WritesBudgetPlan`). Do **not** invent a new scope type.

| Scope | Write `BudgetMonthSavings.MonthlySavings` | Write `Savings.MonthlySavings` |
| --- | --- | --- |
| `currentMonthOnly` | yes — set `IsOverride = 1` | no |
| `currentMonthAndBudgetPlan` | yes — set `IsOverride = 1` | yes |
| `budgetPlanOnly` | no | yes |

**No cascade to other open months.** Goal *contribution* patches do not cascade
to other materialized months (only goal target-date does). Base savings follows
the same rule: a `budgetPlan` write updates `Savings.MonthlySavings` only;
future months pick it up at materialization. *If the reviewer wants a cascade,
that is a separate decision — flag it, do not silently add it.*

## 5. The orphan rule (critical — FE report §4.1 / §6 Q1)

`BudgetMonthSavings.SourceSavingsId` is a **nullable** FK to `Savings.Id`. When
it is `NULL`, the month has no plan baseline (a "month-only orphan").

In that case the two plan-writing scopes (`currentMonthAndBudgetPlan`,
`budgetPlanOnly`) **must be rejected** with a clear, dedicated error. Do
**not** silently create a `Savings` row. This mirrors `CreateSavingsGoal`,
which rejects `SourceSavingsId is null` with `SavingsPlanMissing`.

`currentMonthOnly` is always allowed (it only writes the month row).

## 6. Files to create

All paths relative to `Backend/`.

### 6.1 Request DTO
`Application/DTO/Budget/Months/Editor/Savings/PatchBudgetMonthBaseSavingsRequestDto.cs`

```csharp
public sealed class PatchBudgetMonthBaseSavingsRequestDto
{
    public decimal AmountMonthly { get; init; }
    public string? Scope { get; init; }
}
```

### 6.2 Response DTO
`Application/DTO/Budget/Months/Editor/Savings/BudgetMonthBaseSavingsEditorDto.cs`

```csharp
public sealed record BudgetMonthBaseSavingsEditorDto(
    decimal MonthlyAmount,   // the persisted current-month base savings
    bool IsMonthOnly);       // true when SourceSavingsId IS NULL — FE disables plan scopes
```

`IsMonthOnly` resolves FE report §6 Q1: the dialog needs to know whether to
offer the plan scopes. Returning it on the patch response lets the FE update
its gate without a second round-trip.

### 6.3 Command
`Application/Features/Budgets/Months/Editor/Savings/PatchBaseSavings/PatchBudgetMonthBaseSavingsCommand.cs`

```csharp
public sealed record PatchBudgetMonthBaseSavingsCommand(
    Guid Persoid,
    string YearMonth,
    decimal AmountMonthly,
    string? Scope = null)
    : IRequest<Result<BudgetMonthBaseSavingsEditorDto?>>, ITransactionalCommand;
```

`ITransactionalCommand` is required — the transactional pipeline behaviour opens
the DB transaction the repository writes need.

### 6.4 Validator
`.../PatchBaseSavings/PatchBudgetMonthBaseSavingsCommandValidator.cs`

Mirror `PatchBudgetMonthSavingsGoalCommandValidator`:

- `Persoid` `NotEmpty`.
- `YearMonth` `NotEmpty` + `Matches(@"^\d{4}-(0[1-9]|1[0-2])$")`.
- `AmountMonthly` `GreaterThanOrEqualTo(0m)`, an upper bound consistent with the
  savings-goal validator's `MaxAmount`, and `PrecisionScale(12, 2, false)`.
- `Scope` `Must(BudgetMonthSavingsGoalEditScopes.IsSupported)`.

### 6.5 Handler
`.../PatchBaseSavings/PatchBudgetMonthBaseSavingsCommandHandler.cs`

Inject the same dependencies as `PatchBudgetMonthSavingsGoalCommandHandler`:
`IBudgetMonthLifecycleService`, the savings mutation repository (see §7),
`IBudgetMonthChangeEventRepository`, `TimeProvider`.

Flow:

1. `EnsureAccessibleMonthAsync(cmd.Persoid, cmd.Persoid, cmd.YearMonth, ct)` —
   on failure return `Result.Failure(ensured.Error!)`.
2. `GetBudgetMonthMetaAsync(budgetMonthId, ct)` — null → `NotFound`.
3. Reject if status is not `BudgetMonthStatuses.Open` → `BudgetMonth.MonthIsClosed`.
4. Load the month savings row (see §7 `GetBudgetMonthSavingsForBaseEditAsync`).
   Null → `NotFound`. Capture `SourceSavingsId`, current `MonthlySavings`.
5. Resolve scope (default to `currentMonthOnly` when null/blank, like the goal
   applier's `ResolveScope`). Compute `writesCurrentMonth` / `writesBudgetPlan`.
6. **Orphan guard:** if `writesBudgetPlan` and `SourceSavingsId is null` →
   return the dedicated error (§8). Do not create a baseline.
7. **No-op guard:** if `AmountMonthly == existing.MonthlySavings` and the only
   write target is the current month (or the value already equals both
   targets), skip the write and the audit row — return success with the current
   value. Decimal equality is by value (`2400.00m == 2400m`). Mirror the goal
   applier's no-op handling.
8. If `writesCurrentMonth` and the value changed → `UpdateMonthBaseSavingsAsync`
   (sets `MonthlySavings`, `IsOverride = 1`, `UpdatedAt`, `UpdatedByUserId`).
9. If `writesBudgetPlan` and the value changed → `UpdateBaselineBaseSavingsAsync`
   (sets `Savings.MonthlySavings`, `UpdatedAt`, `UpdatedByUserId`).
10. Insert one `BudgetMonthChangeEventWriteModel` audit row describing the
    change (`before` / `after` amount, resolved scope, which targets were
    written). Skip the audit row entirely on a pure no-op.
11. Return `BudgetMonthBaseSavingsEditorDto(MonthlyAmount, IsMonthOnly)` where
    `MonthlyAmount` is the persisted current-month value and
    `IsMonthOnly = SourceSavingsId is null`.

Use `_timeProvider.GetUtcNow().UtcDateTime` for all timestamps — never
`DateTime.Now`. Thread `ct` through every async call.

## 7. Repository changes

The existing `IBudgetMonthSavingsGoalMutationRepository` is goal-specific.
**Recommended:** add a small focused interface
`IBudgetMonthBaseSavingsMutationRepository` (+ implementation under
`Infrastructure/Repositories/Budget/Months/Editor/Savings/`) rather than
widening the goal repo. Register it in DI next to the goal repo registration.

> **Decision to confirm with the reviewer:** new interface vs. extending the
> goal repo. Default to the new interface; if the reviewer prefers extension,
> follow that. Either way the SQL below is unchanged.

Methods (Dapper, parameterized, explicit columns, MariaDB):

- `GetBudgetMonthSavingsForBaseEditAsync(Guid budgetMonthId, CancellationToken)`
  → `{ Id, SourceSavingsId, MonthlySavings, IsOverride }`
  ```sql
  SELECT s.Id, s.SourceSavingsId, s.MonthlySavings, s.IsOverride
  FROM BudgetMonthSavings s
  WHERE s.BudgetMonthId = @BudgetMonthId AND s.IsDeleted = 0
  LIMIT 1;
  ```
- `UpdateMonthBaseSavingsAsync(...)`
  ```sql
  UPDATE BudgetMonthSavings
  SET MonthlySavings = @MonthlySavings, IsOverride = 1,
      UpdatedAt = @UtcNow, UpdatedByUserId = @ActorPersoid
  WHERE Id = @Id;
  ```
- `UpdateBaselineBaseSavingsAsync(...)`
  ```sql
  UPDATE Savings
  SET MonthlySavings = @MonthlySavings,
      UpdatedAt = @UtcNow, UpdatedByUserId = @ActorPersoid
  WHERE Id = @SavingsId;
  ```

`@SavingsId` for the baseline update is the `SourceSavingsId` read in step 4.
Follow the existing repo split convention: SQL constants in a
`*.Sql.cs` partial, methods in the `.cs` partial (see
`BudgetMonthSavingsGoalMutationRepository` / `.Sql.cs`).

## 8. Errors

Add a dedicated error rather than reusing a goal error. Follow the existing
pattern in `Backend/Domain/Errors/Budget/` (e.g. `Errors.SavingsMethodErrors.cs`,
`BudgetMonthSavingsGoalErrors`). Suggested:

`Domain/Errors/Budget/Errors.BaseSavingsErrors.cs`

- `BaseSavings.PlanMissing` — "Cannot edit the savings plan: this month has no
  plan baseline." Returned for plan scopes when `SourceSavingsId IS NULL`.

Reuse existing shared errors for the rest: `BudgetMonth.MonthIsClosed`, and a
`NotFound` consistent with the savings slices.

## 9. Endpoint

Add to `BudgetController.Editor.Savings.cs` (created in PR 1). Match the
`ApiEnvelope` pattern used by every other action in that file:

```csharp
[HttpPatch("months/{yearMonth}/base-savings")]
[ProducesResponseType(typeof(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>), StatusCodes.Status200OK)]
public async Task<ActionResult<ApiEnvelope<BudgetMonthBaseSavingsEditorDto>>> PatchBaseSavings(
    [FromRoute] string yearMonth,
    [FromBody] PatchBudgetMonthBaseSavingsRequestDto req,
    CancellationToken ct)
{
    var result = await _mediator.Send(
        new PatchBudgetMonthBaseSavingsCommand(
            Persoid: _currentUser.Persoid,
            YearMonth: yearMonth,
            AmountMonthly: req.AmountMonthly,
            Scope: req.Scope),
        ct);

    if (result.IsFailure || result.Value is null)
        return Ok(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>.Failure(
            code: result.Error?.Code ?? "BUDGET_MONTH_BASE_SAVINGS_PATCH_FAILED",
            message: result.Error?.Message ?? "Could not update base savings."));

    return Ok(ApiEnvelope<BudgetMonthBaseSavingsEditorDto>.Success(result.Value));
}
```

Keep the controller thin — no logic beyond delegation, exactly like the
neighbouring actions.

## 10. Pre-flight verification (FE report §6 Q2 & Q3)

Do this **inside this PR** — it is verification, not a separate PR. Report
findings in the PR description. If something is wrong, raise it before merging
rather than working around it.

- **Q2 — base figure equality.** Confirm the dashboard's `savings.monthlySavings`
  and `savings.totalSavingsMonthly` are the same base amount. The
  `SavingsOverviewDto` comments say they are equal; confirm the projector
  populates both from `BudgetMonthSavings.MonthlySavings`.
- **Q3 — Kvar identity.** Confirm the dashboard's `finalBalanceWithCarry` omits
  **only** goal contributions, so the FE six-term balance strip cannot disagree
  with the dashboard page. If it omits anything else, flag it.

## 11. Tests

Add an integration test, mirroring
`Backend.Tests/.../BudgetMonths/Editor/SavingsMethodWriteTests.cs`
(uses `IntegrationTestBase`, real MariaDB-backed test DB). Cover:

- `currentMonthOnly` → only `BudgetMonthSavings.MonthlySavings` changes,
  `Savings.MonthlySavings` untouched, `IsOverride = 1`.
- `currentMonthAndBudgetPlan` → both rows change.
- `budgetPlanOnly` → only `Savings.MonthlySavings` changes.
- Orphan: `SourceSavingsId IS NULL` + a plan scope → fails with
  `BaseSavings.PlanMissing`, nothing written.
- Orphan: `SourceSavingsId IS NULL` + `currentMonthOnly` → succeeds.
- Closed month → fails with `BudgetMonth.MonthIsClosed`.
- No-op: patching the same amount twice → second call writes nothing and emits
  no audit row (idempotent).
- An audit `BudgetMonthChangeEvent` row is written on a real change.

## 12. What NOT to do

- Do not change any total / projector / snapshot / monthly-totals logic. The FE
  reconciliation is display-only; `TotalSavingsMonthly` stays base-only.
- Do not create a `Savings` baseline row for orphan months.
- Do not add a cascade to other open months without reviewer sign-off.
- Do not touch goal contributions, methods, auth, Docker, Caddy, or CI.
- Do not widen `IBudgetMonthSavingsGoalMutationRepository` with base-savings
  methods unless the reviewer explicitly chooses that over a new interface.

## 13. Acceptance criteria

- `PATCH months/{yearMonth}/base-savings` exists and persists base savings per
  the §4 scope table.
- Orphan plan-scope edits are rejected; `currentMonthOnly` always works.
- Response carries `MonthlyAmount` and `IsMonthOnly`.
- Every change writes one audit row; no-ops write none.
- `dotnet build` succeeds; the new integration tests pass.
- §10 verification findings are recorded in the PR description.

## 14. Wrap-up (repo rule)

1. Append an entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, risks/follow-up).
2. Write the commit message to `COMMIT_MSG.tmp`, e.g.
   `feat(savings): persist base monthly savings edits with scoped writes`.
3. Stop. Do not commit or push.

## 15. Frontend follow-up (NOT this PR — for awareness)

Once this PR ships, a separate frontend change swaps the
`SavingsBaseHabitDialog` placeholder + `baseMonthlyOverride` session state for a
real mutation hook against `PATCH months/{ym}/base-savings`, and uses
`IsMonthOnly` to disable the plan scopes. That work is out of scope here.
