# PR 1 — Split `BudgetController.Editor.cs` by domain

| | |
| --- | --- |
| **Type** | Refactor — pure file move, zero behaviour change |
| **Depends on** | Nothing |
| **Blocks** | PR 2 (adds a savings endpoint into the file this PR creates) |
| **Risk** | Trivial |
| **Branch** | current branch (`feature/PolishDashboardEditor`) — do not branch/worktree |

---

## 1. Why this PR exists

`Backend/Presentation/Controllers/Budget/BudgetController.Editor.cs` is **681
lines** and mixes four unrelated domains — expense items, income items, savings
goals/methods, and debt items — in one file. Adding the savings endpoint in
PR 2 into that file would make it worse. Split it first so PR 2 lands in a
clean, savings-only file.

This is a **mechanical refactor**. No route changes. No DI changes. No logic
changes. The HTTP surface is byte-for-byte identical before and after.

## 2. Current state

`BudgetController` is one `public sealed partial class` spread across these
files in `Backend/Presentation/Controllers/Budget/`:

- `BudgetController.cs` — primary declaration: ctor, `[ApiController]`,
  `[Route("api/budgets")]`, `[Authorize(Policy = "EmailConfirmed")]`, the
  `_mediator` / `_currentUser` fields. **Leave this file untouched.**
- `BudgetController.Dashboard.cs`, `.MonthLifecycle.cs`, `.MonthRecap.cs`,
  `.ExpenseCategories.cs` — already domain-scoped. **Leave these untouched.**
- `BudgetController.Editor.cs` — **the file to split** (681 lines).

## 3. The split

Create four new partial-class files and slim `Editor.cs` down. Every new file:

- declares `namespace Backend.Presentation.Controllers;`
- declares `public sealed partial class BudgetController { ... }`
- carries **only the `using` directives its own actions need** (do not copy the
  whole `using` block — split it)
- contains the action methods **verbatim** — copy the method bodies exactly,
  do not "improve" them

| File | Action methods to move into it | Routes (unchanged) |
| --- | --- | --- |
| `BudgetController.Editor.cs` (keep) | `GetMonthEditor` only | `GET months/{ym}/editor` |
| `BudgetController.Editor.Expenses.cs` (new) | `PatchExpenseItem`, `PatchExpenseItemsBulk`, `CreateExpenseItem`, `DeleteExpenseItem` | `PATCH/POST/DELETE months/{ym}/expense-items` |
| `BudgetController.Editor.Income.cs` (new) | `GetIncomeItems`, `CreateIncomeItem`, `PatchIncomeItem`, `PatchIncomeItemsBulk`, `DeleteIncomeItem` | `GET/POST/PATCH/DELETE months/{ym}/income-items` |
| `BudgetController.Editor.Savings.cs` (new) | `GetSavingsGoals`, `GetOldSavingsGoals`, `GetSavingsMethods`, `AddSavingsMethod`, `RemoveSavingsMethod`, `CreateSavingsGoal`, `PatchSavingsGoal`, `PatchSavingsGoalsBulk`, `CompleteSavingsGoal`, `CancelSavingsGoal`, `RemoveSavingsGoal` | `months/{ym}/savings-goals*`, `months/{ym}/savings-methods*` |
| `BudgetController.Editor.Debts.cs` (new) | `GetDebtItems`, `PatchDebtItem`, `PatchDebtItemsBulk` | `GET/PATCH months/{ym}/debt-items` |

After the move, `Editor.cs` keeps only `GetMonthEditor` and the `using`s that
method needs (`...Editor.Queries`, `...DTO.Budget.Months.Editor`,
`Backend.Presentation.Shared`, `Microsoft.AspNetCore.Mvc`).

> The action methods named above are the complete inventory of `Editor.cs` as
> of commit `3a9d16e6`. If you find a method not in this table, stop and report
> it — do not guess where it belongs.

### Namespace gotcha — split the expense usings carefully

The expense actions need **two** DTO namespaces, not one. The original
`Editor.cs` had both:

- `Backend.Application.DTO.Budget.Months.Editor` — the **request** DTOs
  (`CreateBudgetMonthExpenseItemRequestDto`,
  `PatchBudgetMonthExpenseItemRequestDto`,
  `PatchBudgetMonthExpenseItemsBulkRequestDto`,
  `PatchBudgetMonthExpenseItemBulkRowDto`) live in the parent `.Editor`
  namespace.
- `Backend.Application.DTO.Budget.Months.Editor.Expense` — only the **row**
  DTO (`BudgetMonthExpenseItemEditorRowDto`) lives under `.Editor.Expense`.

`BudgetController.Editor.Expenses.cs` must carry **both** usings. Inspect each
action's `Request` / `Row` types before pruning usings — a "neat" prune that
drops the parent `.Editor` using compiles in isolation against the row DTO and
breaks on the request DTOs. Apply the same care to the other domain partials.

## 4. Hard constraints

- **No behaviour change.** Same route templates, same HTTP verbs, same
  `[ProducesResponseType]`, same `ApiEnvelope` handling, same parameter binding.
- Do **not** rename anything, change signatures, or "tidy" the bodies.
- Do **not** create separate controller *classes* — these stay partials of the
  one `BudgetController`. Separate classes would force re-declaring the route
  prefix and the `EmailConfirmed` policy per class for no gain.
- Do **not** touch `Program.cs`, DI registration, auth, or routing config.
- Keep the file naming convention: `BudgetController.Editor.<Domain>.cs`.

## 5. Acceptance criteria

- `BudgetController.Editor.cs` contains only `GetMonthEditor`.
- Four new `BudgetController.Editor.*.cs` files exist as listed above.
- Every new file compiles as a partial of `BudgetController`.
- `git grep` shows no route string changed.
- `dotnet build` from `Backend/` succeeds with no new warnings.

## 6. Validation

```
cd Backend && dotnet build
```

Optionally run the existing month-editor smoke test if one exists. No new tests
are required — this PR adds no behaviour.

## 7. Wrap-up (repo rule)

1. Append a short entry to `docs/ai/ai-changelog.md` (date, what changed, files
   touched, risk = none/refactor).
2. Write the commit message to `COMMIT_MSG.tmp`, Conventional Commits style,
   e.g. `refactor(budget): split BudgetController.Editor.cs by domain`.
3. Stop. Do not commit or push.
