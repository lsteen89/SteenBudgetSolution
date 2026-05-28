# PR 07 — Savings-goal one-time transfer (backend slice)

| | |
| --- | --- |
| **Type** | New backend feature slice — introduces a new mutation pattern (direct `AmountSaved` delta with deposit/withdraw semantics). |
| **Depends on** | PR 1 (controller split). Independent of PR 05 / PR 06. |
| **Blocks** | PR 09 (FE Engångsöverföring modal). |
| **Risk** | Medium — this is the first endpoint that mutates a `AmountSaved` directly. Financial value; needs careful audit + bounds. Treat with the same care as a debt-payment write. |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch or worktree. |

---

## 1. Why this PR exists

V2's primary action on each goal card is **"Sätt in"** — a one-time
deposit or withdrawal that mutates the saved-so-far figure outside the
regular monthly accumulation cycle. Today `AmountSaved` only moves at two
points: at goal creation (initial seed) and at month-close
(`BudgetMonthSavingsGoalMutationRepository.Sql.cs:237–263`, accumulating
`MonthlyContribution`). The user has no way to record a mid-month top-up,
correct a miscount, or pull money back out.

This PR adds that surface as a single endpoint that takes a **signed
delta** behind a `direction` field.

## 2. Read first

- **`Work/Dashboard/savings/PR-V2-OVERVIEW.md`** — gap analysis, rules.
- **`Backend/Application/Features/Budgets/Months/Editor/Savings/PatchSavingsGoal/SavingsGoalMutationApplier.cs`** —
  the audit/no-op/baseline-exists pattern to mirror.
- **`Backend/Infrastructure/Repositories/Budget/Months/Editor/Savings/BudgetMonthSavingsGoalMutationRepository.Sql.cs:237–290`** —
  read carefully. The "snapshot vs source baseline + close-accumulation"
  model decides where the delta lives.
- **`docs/BudgetPeriodLifecycleSpec.md`** — close-month math depends on
  `AmountSaved`. Make sure §3 below preserves the existing invariant.
- **`Work/Dashboard/savings/SAVINGS-WIRING-AUDIT.md`** — the audit that
  defined "the savings backend is mostly built" — this PR is one of the
  two remaining real gaps.

## 3. Source-of-truth decision (read before coding)

`AmountSaved` lives on **both** `SavingsGoal` (the plan baseline) and
`BudgetMonthSavingsGoal` (the per-month snapshot). Which one moves on a
deposit?

**Decision: write the delta to BOTH.**

- The **plan baseline** (`SavingsGoal.AmountSaved`) is what new months
  read at materialization. A deposit that doesn't update the baseline
  would silently revert on next month open.
- The **current-month snapshot** (`BudgetMonthSavingsGoal.AmountSaved`)
  is what the current month's UI reads. Without the snapshot update the
  user wouldn't see their deposit take effect until next month.
- Both writes happen in the same transaction (handler is
  `ITransactionalCommand`).
- Other already-materialized open months are **not** cascaded. Each open
  month's snapshot was created against the baseline that existed at the
  time the month was materialized; a later mid-month transfer should
  apply only to the month the user is editing. The next month-open will
  re-read the (now-updated) baseline and reflect the deposit there. This
  matches the existing per-month editor convention and avoids
  cross-month surprises.
- For **month-only rows** (`SourceSavingsGoalId IS NULL`) only the
  snapshot moves — same shape as PR-05 / PR-06.

Reject withdrawals that would push `AmountSaved` below zero:

- Hard rule: `existing.AmountSaved + delta >= 0`. If violated, return a
  new error `BudgetMonthSavingsGoalErrors.WithdrawalBelowZero`.
- Soft rule (NOT enforced at BE — UI shows a warning):
  `existing.AmountSaved + delta > TargetAmount`. Allow it; users may
  legitimately over-save.

## 4. Backend contract

### Route

```
POST /api/budget/months/{yearMonth}/savings-goals/{monthSavingsGoalId}/transfer
Body: { "amount": 1000.00, "direction": "deposit" | "withdraw", "note": null }
```

`note` is optional, max 200 chars — stored in the audit payload only, not
on the row. (Mirrors the spirit of `docs/ai/savings-mvp-report.md`'s
"audit-first" guidance.)

### Request DTO

```csharp
public sealed record TransferBudgetMonthSavingsGoalRequestDto(
    decimal Amount,
    string Direction,         // "deposit" | "withdraw"
    string? Note = null);
```

### Command

```csharp
public sealed record TransferBudgetMonthSavingsGoalCommand(
    Guid Persoid,
    string YearMonth,
    Guid MonthSavingsGoalId,
    decimal Amount,
    string Direction,
    string? Note)
    : IRequest<Result<BudgetMonthSavingsGoalEditorRowDto?>>, ITransactionalCommand;
```

### Direction constants

Add `Backend/Application/Features/Budgets/Months/Editor/Savings/TransferSavingsGoal/SavingsGoalTransferDirections.cs`:

```csharp
public static class SavingsGoalTransferDirections
{
    public const string Deposit = "deposit";
    public const string Withdraw = "withdraw";
    public static bool IsSupported(string value)
        => value is Deposit or Withdraw;
}
```

### Validator

- `Amount > 0` (the sign is carried by `Direction`, not the value).
- `Amount <= 10_000_000m` (same upper bound as `TargetAmount`).
- `Amount` has at most 2 decimals.
- `Direction` is one of the two constants (case-insensitive at
  controller, lowercase normalized in the handler).
- `Note` optional, `MaxLength(200)`.

### Handler

Mirror `PatchBudgetMonthSavingsGoalCommandHandler`:

1. `EnsureAccessibleMonthAsync`.
2. Month-meta + open-status check.
3. `GetSavingsGoalForMutationAsync` + deleted/closed guards.
4. Normalize direction to lowercase. Compute `signedDelta = direction ==
   Deposit ? +amount : -amount`.
5. If `signedDelta < 0 && existing.AmountSaved + signedDelta < 0`, return
   `BudgetMonthSavingsGoalErrors.WithdrawalBelowZero`.
6. If `SourceSavingsGoalId is not null`, require baseline-exists
   (`BaselineSavingsGoalExistsAsync`) — copy the rule from
   `SavingsGoalMutationApplier.cs:62–75`. On miss return
   `SourcePlanNotFound`.
7. Delegate to new `SavingsGoalTransferApplier`:
   - UPDATE snapshot `AmountSaved` (set, do not add — handler computes the
     new value and passes it explicitly so the SQL is parameterized and
     deterministic).
   - If baseline-linked, UPDATE baseline `AmountSaved`.
   - One `BudgetMonthChangeEvent` with
     `{ before: { AmountSaved: old }, after: { AmountSaved: new },
        direction, amount, note, baselineUpdated }`.

### Repository

Two new methods on `IBudgetMonthSavingsGoalMutationRepository`:

- `Task UpdateMonthSavingsGoalAmountSavedAsync(UpdateBudgetMonthSavingsGoalAmountSavedModel m, CancellationToken ct)`
- `Task UpdateBaselineSavingsGoalAmountSavedAsync(UpdateBaselineSavingsGoalAmountSavedModel m, CancellationToken ct)`

SQL: two parameterized UPDATE statements with explicit columns. Update
audit columns.

### Controller

```
[HttpPost("months/{yearMonth}/savings-goals/{monthSavingsGoalId:guid}/transfer")]
```

Failure envelope code: `BUDGET_MONTH_SAVINGS_GOAL_TRANSFER_FAILED`.

## 5. Files to touch

Same shape as PR-05 — new
`Backend/Application/Features/Budgets/Months/Editor/Savings/TransferSavingsGoal/`
folder; one new DTO; two new models; constants file; two repo methods +
SQL; one controller route; two new domain error codes
(`WithdrawalBelowZero`, reuse `SourcePlanNotFound`); one new integration
test file.

## 6. Validation

- `dotnet build` in `Backend/`.
- Integration tests:
  1. Deposit happy path — snapshot + baseline updated; row DTO reflects
     `AmountSaved + amount`.
  2. Withdraw happy path — snapshot + baseline decremented.
  3. Month-only goal — only snapshot.
  4. Withdraw that would go below zero → `WithdrawalBelowZero`, no DB
     change.
  5. Closed month → `BudgetMonth.MonthIsClosed`.
  6. Plan-linked goal with missing baseline → `SourcePlanNotFound`.
  7. Audit payload includes `direction`, `amount`, `note`,
     `baselineUpdated`.
  8. Idempotency note: this command is NOT idempotent at the BE (every
     POST creates a new audit row + delta). The FE is responsible for
     debouncing the Save button (PR-09). Document this on the controller
     route.
- Unit tests for validator boundaries (negative, zero, 10_000_000.01,
  3-decimal, invalid direction string).

## 7. What this PR does NOT cover

- **No habit/buffer transfer.** The V2 design's "Sätt in extra" on the
  bassparande row routes to the same modal in a "buffer" mode. Our data
  model has no buffer balance — `Savings.MonthlySavings` is a monthly
  outflow, not a stock. PR-09 will open the modal disabled with a
  "Snart" hint when the source is the habit row. A future PR can model
  a buffer (probably a new `SavingsBuffer` table) and add a parallel
  `Savings.MonthlyBufferTransfer` slice — out of scope here.
- **No bulk transfer.** One goal at a time.
- **No close-month cross-check.** Existing close-month logic accumulates
  `MonthlyContribution` into `AmountSaved` — that still runs. A
  mid-month transfer is layered on top of that flow, not in place of
  it. Verify with the lifecycle spec that the math still adds up; add
  one integration test that runs `Close-month` after a deposit and
  asserts the final `AmountSavedAtClose` equals
  `(initialAmountSaved + deposit) + monthlyContribution`.

## 8. After the task

Changelog + `COMMIT_MSG.tmp`
(`feat(savings): add one-time goal transfer endpoint`), then stop.
