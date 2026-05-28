# PR 5 — Expose source-plan values for linked expense rows

| | |
| --- | --- |
| **Type** | Backend read-model extension |
| **Depends on** | Nothing |
| **Blocks** | PR 6 |
| **Risk** | Medium — API shape extension, but additive |

---

## 1. Why this PR exists

The prototype shows plan-aware UI:

- `Changed in May`
- `+300 kr compared with the plan`
- modal preview of current-month total vs budget-plan total

Current `BudgetMonthExpenseItemEditorRowDto` cannot support this honestly.
It does not include the linked `ExpenseItem` source values.

This PR adds additive read-only fields to the editor DTO. It does not change
mutation behavior.

## 2. Current files

- `Backend/Application/DTO/Budget/Months/Editor/Expense/BudgetMonthExpenseItemEditorRowDto.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Models/Expense/BudgetMonthExpenseItemEditorRowReadModel.cs`
- `Backend/Application/Features/Budgets/Months/Editor/Queries/GetBudgetMonthEditorQueryHandler.cs`
- `Backend/Infrastructure/Repositories/Budget/Months/Editor/BudgetMonthEditorRepository.Sql.cs`
- `Frontend/src/types/budget/BudgetMonthsStatusDto.ts`

## 3. Proposed DTO extension

Add nullable source-plan fields:

```csharp
Guid? SourceCategoryId
string? SourceName
decimal? SourceAmountMonthly
bool? SourceIsActive
```

Frontend type:

```ts
sourceCategoryId: string | null;
sourceName: string | null;
sourceAmountMonthly: number | null;
sourceIsActive: boolean | null;
```

Why these fields:

- amount delta needs `SourceAmountMonthly`
- category/name changed badges need source category/name
- active/inactive plan comparison needs `SourceIsActive`
- nullable preserves month-only rows and broken source rows honestly

## 4. SQL

Update `GetExpenseItemEditorRows` to left join source rows:

```sql
LEFT JOIN ExpenseItem ei ON ei.Id = bmei.SourceExpenseItemId
```

Select explicit source columns:

- `ei.CategoryId AS SourceCategoryId`
- `ei.Name AS SourceName`
- `ei.AmountMonthly AS SourceAmountMonthly`
- `ei.IsActive AS SourceIsActive`

Keep existing ordering and include-deleted behavior.

## 5. Handler mapping

Map nullable source fields into `BudgetMonthExpenseItemEditorRowDto`.

Preserve existing fields:

- `IsMonthOnly = SourceExpenseItemId is null`
- `CanUpdateDefault = SourceExpenseItemId is not null`

Do not change command handlers. They already validate source existence before
writing plan scopes.

## 6. Tests

Prefer integration tests if an editor query test fixture already exists. If not,
add focused repository/query tests following existing budget-month test patterns.

Test cases:

- linked row returns source values.
- month-only row returns null source values.
- deleted rows still return source values when `includeDeleted = true`.

## 7. Acceptance criteria

- Existing editor endpoint remains backwards compatible.
- New fields are present for linked rows.
- New fields are null for month-only rows.
- No mutation behavior changes.
- `dotnet build` passes.

## 8. Validation

Run:

```bash
cd Backend
dotnet build
```

Run the narrow backend test target added/updated by this PR.

## 9. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
