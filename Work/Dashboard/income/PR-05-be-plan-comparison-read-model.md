# PR 5 — Backend Plan Comparison Read Model

## Goal

Expose source-plan values for income editor rows so the frontend can render
`Ändrad i {månad}` and plan deltas honestly.

## Scope

Backend read model only, plus frontend type compile updates if needed.

Likely backend files:

- `Backend/Application/Features/Budgets/Months/Editor/Income/*`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/Income/*`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Income.cs`
- integration tests around income editor reads

Do not change:

- schema
- dashboard totals
- materialization behavior
- create/patch/delete mutation behavior
- income lifecycle

## DTO Additions

Add nullable source-plan fields:

```csharp
string? SourceName
decimal? SourceAmountMonthly
bool? SourceIsActive
```

Month-only rows return null for all source fields.

Salary can return a null/stable source name; frontend should still render
localized salary copy and compare amount/active safely.

## SQL Rules

Join source rows by kind:

- salary: `BudgetMonthIncome.SourceIncomeId -> Income`
- side income: `SourceSideHustleId -> IncomeSideHustle`
- household income: `SourceHouseholdMemberId -> IncomeHouseholdMember`

Use explicit SQL columns and aliases. Preserve MariaDB compatibility.

## Acceptance Criteria

- Linked side/household rows include source-plan amount and active state.
- Linked salary row includes source-plan amount where available.
- Month-only rows return null source fields.
- Deleted rows keep existing read behavior unless the current read model
  already filters them.
- Existing mutations still pass unchanged.
- No dashboard math changes.

## Validation

- Add/extend integration tests in the income editor test area.
- Run focused backend income editor tests.
- Run `dotnet build` if the focused test command does not compile the changed
  projects.

## Hard Stops

Do not add income categories, future-plan create, paused/cancelled lifecycle, or
new money math in this PR.
