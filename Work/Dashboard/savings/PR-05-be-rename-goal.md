# PR 05 — Rename savings goal (backend slice)

| | |
| --- | --- |
| **Type** | New backend feature slice — one route, one command, one handler. |
| **Depends on** | PR 1 (controller split) — already in tree. |
| **Blocks** | PR 10 (FE kebab → rename modal). |
| **Risk** | Low — `Name` is a plain string, not a financial value. No transaction-shape change. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

V2 (`PR-V2-OVERVIEW.md` §1) gives every goal card a kebab menu whose first
item is **"Byt namn"**. Today `SavingsGoal.Name` and
`BudgetMonthSavingsGoal.Name` are set at creation
(`CreateSavingsGoal/CreateBudgetMonthSavingsGoalCommandHandler.cs:79, :95`)
and never re-written. There is no edit endpoint. This PR adds one,
modelled on `PatchSavingsGoal`.

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`** — gap analysis, ground
  rules, sequencing.
- **`Backend/Application/Features/Budgets/Months/Editor/Savings/PatchSavingsGoal/`** —
  the canonical template. Mirror its: lifecycle gate, status check,
  baseline-exists rule for plan writes, audit shape, response DTO.
- **`Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs:164–191`** —
  the `PatchSavingsGoal` route is the model for the new route signature.
- **`docs/ai/ai-changelog.md`** — append your entry after.

## 3. Scope

**In:** rename a goal's `Name`. Always writes both the current-month
snapshot row AND the source plan row when one exists (the name is a
plan-level field; current-month-only would create permanent drift). For
month-only rows (`SourceSavingsGoalId IS NULL`) the write touches the
snapshot only.

**Out:** No scope strip in the UI — name doesn't have per-month vs plan
semantics worth choosing. No cascade to other open months (other open
months share the same `SourceSavingsGoal.Name` already; the read picks it
up automatically — confirm during implementation).

## 4. Backend contract

### Route

```
PATCH /api/budget/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/name
Body: { "name": "Sommarresa 2026" }
```

### Request DTO

`Backend/Application/DTO/Budget/Months/Editor/Savings/RenameBudgetMonthSavingsGoalRequestDto.cs`

```csharp
public sealed record RenameBudgetMonthSavingsGoalRequestDto(string Name);
```

### Command

`Backend/Application/Features/Budgets/Months/Editor/Savings/RenameSavingsGoal/RenameBudgetMonthSavingsGoalCommand.cs`

```csharp
public sealed record RenameBudgetMonthSavingsGoalCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId,
    string Name)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
```

### Validator

- `Name` required, `MaxLength(255)` (matches `CreateBudgetMonthSavingsGoalCommandValidator`'s rule for the same field — find and mirror exactly).
- Trim leading/trailing whitespace before persistence (do it in the
  handler, not the validator — keep validation pure).

### Handler

Mirror `PatchBudgetMonthSavingsGoalCommandHandler.Handle` exactly:

1. `_lifecycle.EnsureAccessibleMonthAsync` — auth + month ownership.
2. `_repo.GetBudgetMonthMetaAsync` + open-status check.
3. `_repo.GetSavingsGoalForMutationAsync` + deleted/closed guards.
4. Delegate to a new `SavingsGoalRenameApplier.ApplyAsync` (next to the
   handler — same folder pattern as `SavingsGoalMutationApplier`).

The applier:

- If `existing.Name == newName.Trim()` → no-op, return the existing row
  DTO without an audit row (mirrors the no-op short-circuit at
  `SavingsGoalMutationApplier.cs:138–143`).
- Always UPDATE the `BudgetMonthSavingsGoal` row's `Name`.
- If `SourceSavingsGoalId is not null`, also UPDATE the baseline
  `SavingsGoal.Name`.
- Insert one `BudgetMonthChangeEvent` with `{ before: {Name: old}, after: {Name: new} }`.

### Repository

Add two methods to `IBudgetMonthSavingsGoalMutationRepository` and its
`BudgetMonthSavingsGoalMutationRepository`:

- `Task UpdateMonthSavingsGoalNameAsync(UpdateBudgetMonthSavingsGoalNameModel m, CancellationToken ct)`
- `Task UpdateBaselineSavingsGoalNameAsync(UpdateBaselineSavingsGoalNameModel m, CancellationToken ct)`

SQL: two parameterized `UPDATE` statements (one per table). Update
`UpdatedAt` / `UpdatedBy` audit columns where they exist on the parent
tables — copy the pattern from
`UpdateMonthSavingsGoalContributionAsync` / `UpdateBaselineSavingsGoalContributionAsync`.

### Controller

In `BudgetController.Editor.Savings.cs`, copy the `PatchSavingsGoal`
endpoint block and add:

```
[HttpPatch("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/name")]
```

Failure envelope code: `BUDGET_MONTH_SAVINGS_GOAL_RENAME_FAILED`.

## 5. Files to touch

- `Backend/Application/DTO/Budget/Months/Editor/Savings/RenameBudgetMonthSavingsGoalRequestDto.cs` (new)
- `Backend/Application/Features/Budgets/Months/Editor/Savings/RenameSavingsGoal/RenameBudgetMonthSavingsGoalCommand.cs` (new)
- `Backend/Application/Features/Budgets/Months/Editor/Savings/RenameSavingsGoal/RenameBudgetMonthSavingsGoalCommandValidator.cs` (new)
- `Backend/Application/Features/Budgets/Months/Editor/Savings/RenameSavingsGoal/RenameBudgetMonthSavingsGoalCommandHandler.cs` (new)
- `Backend/Application/Features/Budgets/Months/Editor/Savings/RenameSavingsGoal/SavingsGoalRenameApplier.cs` (new)
- `Backend/Application/Features/Budgets/Months/Editor/Models/Savings/UpdateBudgetMonthSavingsGoalNameModel.cs` (new — mirror sibling models)
- `Backend/Application/Features/Budgets/Months/Editor/Models/Savings/UpdateBaselineSavingsGoalNameModel.cs` (new)
- `Backend/Application/Abstractions/Infrastructure/Data/IBudgetMonthSavingsGoalMutationRepository.cs` (add 2 methods)
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Savings/BudgetMonthSavingsGoalMutationRepository.cs` (implement)
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Savings/BudgetMonthSavingsGoalMutationRepository.Sql.cs` (add 2 parameterized statements)
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs` (add route)
- `tests/Backend.IntegrationTests/Budget/Savings/RenameSavingsGoalCommandHandlerTests.cs` (new — see §6)

## 6. Validation

- Build: `dotnet build` in `Backend/`.
- Integration tests (new file): cover
  1. Happy path — both rows updated, baseline name reflected on re-read.
  2. Month-only goal (no `SourceSavingsGoalId`) — only snapshot updated.
  3. No-op (same name) — handler returns the existing DTO, no
     `BudgetMonthChangeEvent` row.
  4. Closed month → `BudgetMonth.MonthIsClosed`.
  5. Deleted row → `BudgetMonthSavingsGoalErrors.RowDeleted`.
  6. Cross-user attempt → 404 via `EnsureAccessibleMonthAsync`.
  Pattern: copy nearest test file in `tests/Backend.IntegrationTests/Budget/Savings/`.
- Unit test for the validator (Name required + max-length) under
  `tests/Backend.UnitTests/Features/Savings/`.

## 7. Out of scope

- No FE work — that lands in PR-10.
- No `BudgetMonthSavingsGoalsBulk` extension (bulk rename is not a V2
  use-case).
- No cascade UPDATE across other open months for the snapshot's `Name`
  column — the read joins to `SavingsGoal.Name` whenever
  `SourceSavingsGoalId IS NOT NULL`, so other open months will see the new
  name on next read. Verify this assumption in the projector before
  closing the PR; if the read path uses the snapshot's `Name` field
  directly, add a cascade in the same style as
  `UpdateOpenLinkedMonthSavingsGoalTargetDateAsync` and gate it the same
  way.

## 8. After the task

Append `docs/ai/ai-changelog.md` (date, files, validation, risks), write
`COMMIT_MSG.tmp` in Conventional Commits style
(`feat(savings): add rename-goal endpoint slice`), then stop.
