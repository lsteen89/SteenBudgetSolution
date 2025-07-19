# ADR-002: Unified Expense Flattening

| Date       | Status                                  | Owner         |
| ---------- | --------------------------------------- | ------------- |
| 2025-07-19 | Accepted (Scheduled for Next Iteration) | Linus Steen |

---

## 1. Context

Initial expense modeling mirrored the wizard’s nested structure:

* Separate objects/tables: Rent, Food, Transport, Clothing, FixedExpenses (+ CustomExpenses), Subscriptions (+ CustomSubscriptions), etc.
* Each required bespoke persistence SQL and conditional logic.
* Adding a new expense field meant new columns, migrations, mapper changes, tests.
* Reporting (totals, category breakdowns) needed multi-join aggregation and duplicated logic.

Goal: simplify persistence, future extensibility, and analytical queries before launch.

## 2. Decision

Flatten all expense data into a single **ExpenseItem** table using stable category identifiers.

**Aggregate (in-memory):**

```csharp
public sealed class Expense
{
    public Guid BudgetId { get; }
    public IReadOnlyList<ExpenseItem> Items { get; }

    public decimal Total => Items.Sum(i => i.AmountMonthly);
    public decimal TotalByCategory(Guid categoryId) => Items.Where(i => i.CategoryId == categoryId)
                                                           .Sum(i => i.AmountMonthly);
}
```

**ExpenseItem (domain + persistence):**

```csharp
public sealed class ExpenseItem
{
    public Guid Id { get; init; }
    public Guid BudgetId { get; init; }
    public Guid CategoryId { get; init; } // Stable constants in ExpenseCategories
    public string Name { get; init; } = string.Empty; // Label: e.g. "Rent", "Electricity", custom name
    public decimal AmountMonthly { get; init; } // Normalized monthly value > 0
}
```

Categories are defined in a static class `ExpenseCategories` with canonical GUIDs (Rent, Food, Transport, Clothing, FixedExpense, Subscription, Other). Mapping uses a helper `AddItem` enforcing invariants.

## 3. Alternatives Considered

| Alternative                                  | Drawbacks                                                           |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Per-category tables                          | Schema sprawl, repetitive insert logic, complex reporting joins.    |
| Polymorphic table with many nullable columns | Wide sparse table, evolving schema pain.                            |
| JSON blob per budget                         | Fast write but poor indexed queries; harder aggregate calculations. |
| EAV (Entity-Attribute-Value)                 | Query complexity, type ambiguity, harder validation.                |

## 4. Consequences

**Positive:**

* Single insert path; reduced persistence branching.
* Easy to add new fixed or custom expense labels without schema change.
* Simple aggregate queries (sum by BudgetId & CategoryId).
* Lower test surface (focus on normalization & `AddItem` invariants).

**Negative:**

* Loses compile-time specialization (no table-level constraints like “Rent must have X”).
* Risk of inconsistent naming if mapping not centralized (mitigated via constants).

**Neutral:**

* Category GUID constants must remain stable (versioning discipline required).

## 5. Invariants & Validation

| Invariant                                           | Enforcement                                                    |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `AmountMonthly > 0`                                 | Filter during mapping (`AddItem`)                              |
| Known `CategoryId`                                  | Membership check: `ExpenseCategories.All.Contains(categoryId)` |
| `Name` non-empty after trim                         | Skip if empty/whitespace                                       |
| Rounding to 2 decimals                              | `decimal.Round(amount, 2, MidpointRounding.AwayFromZero)`      |
| No duplicate (CategoryId + Name + Amount) required? | *Not enforced* (acceptable for now)                            |

(De-duplication can be added later if UX requires.)

## 6. Mapping Strategy

Wizard DTO → `Expense`:

* For each sub-form (Rent, Food, etc.) invoke `AddItem` with canonical label & amount.
* Custom expenses & custom subscriptions looped and added under their respective category GUIDs.
* Zero or null amounts silently ignored.
* After mapping: optional filtering or transformation; currently only positive filter.

## 7. Persistence

Schema (MariaDB / MySQL):

```sql
CREATE TABLE ExpenseItem (
  Id            BINARY(16)   NOT NULL PRIMARY KEY,
  BudgetId      BINARY(16)   NOT NULL,
  CategoryId    BINARY(16)   NOT NULL,
  Name          VARCHAR(255) NOT NULL,
  AmountMonthly DECIMAL(18,2) NOT NULL,
  INDEX IX_ExpenseItem_BudgetCat (BudgetId, CategoryId),
  INDEX IX_ExpenseItem_Budget (BudgetId)
);
```

GUIDs stored as BINARY(16) (via `UUID_TO_BIN` / `BIN_TO_UUID`) for space & index efficiency.

## 8. Reporting Simplicity

**Examples:**

```sql
-- Total expenses for a budget
SELECT SUM(AmountMonthly)
FROM ExpenseItem
WHERE BudgetId = ?;

-- Category breakdown
SELECT CategoryId, SUM(AmountMonthly) AS Total
FROM ExpenseItem
WHERE BudgetId = ?
GROUP BY CategoryId;

-- Top N expense labels
SELECT Name, SUM(AmountMonthly) AS Total
FROM ExpenseItem
WHERE BudgetId = ?
GROUP BY Name
ORDER BY Total DESC
LIMIT 5;
```

## 9. Risks & Mitigations

| Risk                                        | Mitigation                                                         |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Category GUID collision / accidental change | Central constants + unit test asserting GUID values                |
| Uncontrolled label proliferation            | Future: whitelist or normalization map                             |
| Missed invariant (negative or zero values)  | Processor tests & `AddItem` guard                                  |
| Future need for per-category metadata       | Introduce `ExpenseCategory` table referencing same GUIDs if needed |

## 10. Testing

* Unit: rent-only, full mixed payload, zero filtering, custom item inclusion.
* Negative & null values ignored.
* Rounding edge (e.g., 10.005) → 10.01.
* Category ID membership test.

## 11. Migration Plan

1. Implement new mapper (`ToUnifiedExpense`).
2. Replace old multi-entity SQL executor with single ExpenseItem executor.
3. Remove obsolete per-category entity classes.
4. Update processor tests → flattened expectations.
5. Clean dormant tables (if any existed) before production.

(Currently safe—pre-launch.)

## 12. Follow-Ups

* Add optional de-duplication rule (CategoryId + Name aggregation).
* Materialized monthly summary table if performance demands.
* ADR for historical snapshot design (ADR-006).

## 13. Implementation Status

**Progress Checklist**

* [ ] Mapper implemented
* [ ] SQL executor refactored
* [ ] All old entities removed
* [ ] Tests updated (flattened expectations)
* [ ] Indices created (verify in migration)

*(Update as tasks complete.)*

## 14. References

* Commit: `refactor(expense): introduce unified ExpenseItem model` (placeholder)
* ADR-001 (Unit of Work Strategy)

---

**Decision:** Proceed with unified flattened `ExpenseItem` model; treat previous multi-entity approach as deprecated.
