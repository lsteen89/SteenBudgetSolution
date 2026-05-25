# PR 06 — Change savings-goal target amount (backend slice)

| | |
| --- | --- |
| **Type** | New backend feature slice — one route, one command, one handler. |
| **Depends on** | PR 1 (controller split) — already in tree. Independent of PR 05 / PR 07. |
| **Blocks** | PR 10 (FE kebab → change target-amount modal). |
| **Risk** | Medium-low — financial value, but no carry-over / lifecycle implications. The danger is reading `TargetAmount` after the write: callers must re-read, never cache. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

V2's kebab on each goal card carries **"Ändra målbelopp"**. Today
`SavingsGoal.TargetAmount` and `BudgetMonthSavingsGoal.TargetAmount` are
written only at goal creation (`CreateBudgetMonthSavingsGoalCommandHandler.cs:79, :95`).
There is no edit endpoint. The user needs one to correct a typo or shift
the goal's scale ("I now want to save 50 000 kr, not 35 000 kr").

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`** — gap analysis, ground rules.
- **`Backend/Application/Features/Budgets/Months/Editor/Savings/PatchSavingsGoal/`** — template (lifecycle, status, audit, DTO shape).
- **`Backend/Application/Features/Budgets/Months/Editor/Savings/PatchSavingsGoal/SavingsGoalMutationApplier.cs:35–75`** — the *exact* baseline-exists pattern for plan-level writes. Copy it; do not invent a parallel guard.
- **`Backend/Application/Features/Budgets/Months/Editor/Savings/CreateSavingsGoal/CreateBudgetMonthSavingsGoalCommandValidator.cs:43–52`** — existing `TargetAmount > 0` and `AmountSaved <= TargetAmount` rules. Reuse the same predicates.

## 3. Scope

**In:** update `TargetAmount` on the current snapshot row AND the source
plan row when a baseline exists. Validate that
`newTargetAmount >= existing.AmountSaved` so we never persist a goal that
already exceeds its target by construction (the V2 design surfaces this as
inline form validation in the modal).

**Out:** No "shrink to overflow" behaviour (i.e. we do not auto-cap
`AmountSaved` to the new target). No re-compute of `MonthlyContribution`
on the BE — the FE shows a preview ("you'll reach this in X months at
current monthly") but the user chooses whether to also touch the monthly
amount with a separate PR-08 modal.

**Scope strip:** none. Target amount is a plan-level field — like a name.
Always writes both the snapshot and the plan baseline when a baseline
exists. For month-only rows the write touches the snapshot only.

## 4. Backend contract

### Route

```
PATCH /api/budget/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/target-amount
Body: { "targetAmount": 50000.00 }
```

### Request DTO

```csharp
public sealed record ChangeBudgetMonthSavingsGoalTargetAmountRequestDto(
    decimal TargetAmount);
```

### Command

```csharp
public sealed record ChangeBudgetMonthSavingsGoalTargetAmountCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId,
    decimal TargetAmount)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
```

### Validator

- `TargetAmount > 0` (match `CreateBudgetMonthSavingsGoalCommandValidator`).
- `TargetAmount <= 10_000_000m` (match the same upper bound used in
  `CreateSavingsGoal` — find and mirror the literal).
- `TargetAmount <= 2 decimal places` — reuse `MoneyDecimalsHelper` /
  whatever predicate Create uses.

### Handler

Mirror `PatchBudgetMonthSavingsGoalCommandHandler`:

1. `EnsureAccessibleMonthAsync`.
2. Month-meta + open-status check.
3. `GetSavingsGoalForMutationAsync` + deleted/closed guards.
4. **AmountSaved guard.** If `existing.AmountSaved is decimal saved &&
   saved > cmd.TargetAmount` → return
   `BudgetMonthSavingsGoalErrors.TargetBelowSaved` (new error code; add to
   `Backend/Domain/Errors/Budget/BudgetMonthSavingsGoalErrors.cs`).
5. Delegate to a new applier `SavingsGoalTargetAmountApplier`:
   - No-op short-circuit when `existing.TargetAmount == cmd.TargetAmount`.
   - UPDATE snapshot row.
   - If `SourceSavingsGoalId is not null`, also UPDATE the baseline.
   - One `BudgetMonthChangeEvent` with `{ before: {TargetAmount: old},
     after: {TargetAmount: new} }`.

### Repository

Add to `IBudgetMonthSavingsGoalMutationRepository`:

- `Task UpdateMonthSavingsGoalTargetAmountAsync(UpdateBudgetMonthSavingsGoalTargetAmountModel m, CancellationToken ct)`
- `Task UpdateBaselineSavingsGoalTargetAmountAsync(UpdateBaselineSavingsGoalTargetAmountModel m, CancellationToken ct)`

SQL: two parameterized UPDATE statements with explicit columns. Audit
columns (`UpdatedAt`, `UpdatedBy`) updated to match existing patterns.

### Controller

```
[HttpPatch("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/target-amount")]
```

Failure envelope code: `BUDGET_MONTH_SAVINGS_GOAL_TARGET_AMOUNT_FAILED`.

## 5. Files to touch

Same shape as PR-05 — new folder
`Backend/Application/Features/Budgets/Months/Editor/Savings/ChangeSavingsGoalTargetAmount/`
with Command / Validator / Handler / Applier; new DTO + two models; two
repo methods (+ SQL); one controller route; one new domain error code;
one new integration test file.

## 6. Validation

- `dotnet build` in `Backend/`.
- Integration tests:
  1. Happy path (snapshot + baseline updated, returned DTO reflects new value).
  2. Month-only row (snapshot only).
  3. No-op (same amount) — no audit row.
  4. `TargetAmount < AmountSaved` → `TargetBelowSaved` error code.
  5. Closed month → `BudgetMonth.MonthIsClosed`.
  6. Plan baseline missing for plan-linked goal →
     `BudgetMonthSavingsGoalErrors.SourcePlanNotFound` (mirror
     `SavingsGoalMutationApplier.cs:68–74`).
- Unit tests for validator boundaries (0, 1, 2.555, 10_000_000.01).

## 7. Out of scope

- Auto-cap `AmountSaved` when a user shrinks `TargetAmount` — leave as a
  validation error so the user is told explicitly what's wrong.
- Auto-recompute `MonthlyContribution`. The FE will show a preview and the
  user opens **Månadsbelopp** separately if they want to act on it.
- Cascade to other open months — same reasoning as PR-05 §7: the read
  path joins to the source plan when `SourceSavingsGoalId IS NOT NULL`.
  Verify the projector before closing; add cascade only if the snapshot's
  own `TargetAmount` column is what the read returns.

## 8. After the task

Changelog + `COMMIT_MSG.tmp` (`feat(savings): add change-target-amount endpoint slice`), then stop.
