
# Month Lifecycle MVP (Backend) — Contract & Rules

Last updated: 2026-01-08  
Scope: Month lifecycle + month-aware dashboard + bootstrap behavior

---

## Overview

The backend now models budgeting as a sequence of **BudgetMonth** rows per budget.

A month has a `YearMonth` (`YYYY-MM`) and a `Status`:
- `open`   → live computed dashboard (editable in UI)
- `closed` → immutable snapshot totals (read-only)
- `skipped`→ placeholder month inserted to represent gaps (read-only, mostly UX)

### Non-negotiable UX invariants (enforced)
- **Never auto-close months**
- **Never auto-open a new month**  
- **Only allowed automation:** If user has **ZERO months**, backend creates **current month** as `open` the first time they load the dashboard.

---

## Data model

### BudgetMonth
Key fields:
- `BudgetId` (FK to Budget)
- `YearMonth` (CHAR(7) `"YYYY-MM"`)
- `Status` (`open|closed|skipped`)
- `OpenedAt`, `ClosedAt`
- `CarryOverMode` (`none|full|custom`)
- `CarryOverAmount`  
  - `NULL` unless mode is `custom` (and >= 0)
  - When mode is `none`, amount **must be NULL**
- Snapshot totals (only for `closed` months):
  - `SnapshotTotalIncomeMonthly`
  - `SnapshotTotalExpensesMonthly`
  - `SnapshotTotalSavingsMonthly`
  - `SnapshotTotalDebtPaymentsMonthly`
  - `SnapshotFinalBalanceMonthly`

Uniqueness:
- Unique on `(BudgetId, YearMonth)` for idempotent inserts.

---

## Domain rules & behaviors

### Closing a month (snapshot)
When closing an open month, backend computes totals from current budget data and writes snapshot columns.

Final balance snapshot formula:

```

FinalBalance = TotalIncome  
- TotalExpenses  
- TotalSavings  
- TotalDebtPayments  
+ CarryOverAmount (from the open month being closed)

```

### Carry-over when opening target month
User chooses carry-over mode when opening a new month:

- `none`   → carry = 0 (stored as `CarryOverMode=none`, `CarryOverAmount=NULL`)
- `custom` → carry = requested amount (>= 0)
- `full`   → carry = previous month snapshot final balance

### Gaps
If user jumps forward multiple months, backend may insert intermediate months as `skipped`
(only when requested via `CreateSkippedMonths=true`).

### Corruption handling
If multiple `open` months exist (shouldn’t happen), backend:
- keeps the newest `open` month
- marks the others as `skipped`

---

## Result / Error model

Handlers return `Result<T>` with `Error`:
- `Error.Code`
- `Error.Description` (aka message)
- `Error.Type`: `Validation | NotFound | Conflict | Unauthorized`

Common BudgetMonth errors used:
- `InvalidYearMonth`
- `InvalidCarryMode`
- `InvalidCarryAmount`
- `InvalidTargetMonth`
- `OpenMonthExists`
- `MonthIsClosed`
- `MonthNotFound`
- `SnapshotMissing`

---

## API Endpoints

### 1) GET `/api/budgets/months/status`

Purpose:
- Month selector
- “behind” banner (gap detection)
- Suggested action hints

Response: `ApiEnvelope<BudgetMonthsStatusDto>`

`BudgetMonthsStatusDto`:
- `OpenMonthYearMonth: string?`
- `CurrentYearMonth: string`
- `GapMonthsCount: number`
- `SuggestedAction: "CreateFirstMonth" | "PromptStartCurrent" | "None"`
- `Months: Array<{ yearMonth, status, openedAt, closedAt }>`

Rules:
- If no budget exists for user → `ApiEnvelope.Failure("BUDGET_NOT_FOUND", ...)`

---

### 2) POST `/api/budgets/months/start`

Purpose:
- Explicitly close previous open month (optional)
- Explicitly open a target month
- Optionally create skipped placeholders for gap months

Request: `StartBudgetMonthRequestDto`
- `TargetYearMonth: "YYYY-MM"`
- `ClosePreviousOpenMonth: boolean`
- `CarryOverMode: "none" | "full" | "custom"`
- `CarryOverAmount: number`
- `CreateSkippedMonths: boolean`

Key validations:
- `TargetYearMonth` must be `YYYY-MM`
- `CarryOverMode` must be valid
- If `CarryOverMode == none` then `CarryOverAmount` must be `0`
- Cannot re-open a `closed` month
- If an open month exists and `ClosePreviousOpenMonth=false` and target differs → conflict

Returns:
- Updated `BudgetMonthsStatusDto`

---

### 3) GET `/api/budgets/dashboard?yearMonth=YYYY-MM`

Purpose:
- Fetch dashboard for selected month
- If month is closed → return snapshot totals
- If month is open → return live computed dashboard (and include carry-applied totals)

**Important:** Before fetching dashboard, controller triggers bootstrap command:
- EnsureFirstBudgetMonthCommand runs first (write transaction)
- Then dashboard is fetched (read)

Response: `ApiEnvelope<BudgetDashboardMonthDto>`

`BudgetDashboardMonthDto`:
- `Month`:
  - `YearMonth`
  - `Status`
  - `CarryOverMode`
  - `CarryOverAmount`
- `LiveDashboard: BudgetDashboardDto | null`
- `SnapshotTotals: BudgetMonthSnapshotTotalsDto | null`

If `Status == closed`:
- `LiveDashboard == null`
- `SnapshotTotals != null`

If `Status == open`:
- `LiveDashboard != null`
- `SnapshotTotals == null`

---

## Dashboard computed totals (backend owns the math)

`BudgetDashboardDto` now includes carry-applied totals so FE does not duplicate logic:
- `CarryOverAmountMonthly`
- `DisposableAfterExpensesWithCarryMonthly`
- `DisposableAfterExpensesAndSavingsWithCarryMonthly`
- `FinalBalanceWithCarryMonthly`

Why FE should not compute:
- One definition of truth (no drift)
- Consistent rounding
- Closed months become immutable, auditable snapshots
- Easier future changes (tax, debt calc, etc.)

---

## Bootstrap behavior (only allowed automation)

### EnsureFirstBudgetMonthCommand
Triggered automatically by the dashboard controller.

Logic:
1. Find `budgetId` from `persoid`
2. If budget has **no months**
3. Insert current `YearMonth` as `open` with:
   - `CarryOverMode = "none"`
   - `CarryOverAmount = NULL`

Notes:
- Must run in a transaction → implemented as a command invoked from controller.

---

## Examples

### Example A — status shows user is behind
GET `/api/budgets/months/status`

Possible DTO:
- `OpenMonthYearMonth = "2025-12"`
- `CurrentYearMonth = "2026-01"`
- `GapMonthsCount = 1`
- `SuggestedAction = "PromptStartCurrent"`

FE should show banner:  
“New month detected: 2026-01 (you’re 1 months behind)”

---

### Example B — start current month (recommended)
POST `/api/budgets/months/start`
```json
{
  "targetYearMonth": "2026-01",
  "closePreviousOpenMonth": true,
  "carryOverMode": "none",
  "carryOverAmount": 0,
  "createSkippedMonths": true
}

```

----------

### Example C — fetch closed month snapshot

GET `/api/budgets/dashboard?yearMonth=2025-12`

Response has:

-   `month.status = "closed"`
    
-   `snapshotTotals != null`
    
-   `liveDashboard == null`
    

FE must treat as read-only.

----------

## Frontend expectations (MVP)

1.  On Dashboard load:
    

-   Call `/months/status`
    
-   Call `/dashboard` (no yearMonth initially)
    
-   If status indicates behind → show banner (with 24h snooze localStorage)
    

2.  Month selector:
    

-   Uses `/months/status` list
    
-   Selecting month calls `/dashboard?yearMonth=...`
    
-   Closed month disables editing
    

3.  Starting current month:
    

-   Modal: carry over choice (none/full/custom)
    
-   Submit POST `/months/start` with target=current, closePrevious=true, createSkipped=true
    
-   Refresh status + dashboard
    

----------

## Testing notes

-   Integration tests exist for:
    
    -   month start/close/snapshot correctness
        
    -   idempotent month open
        
    -   query handlers (month dashboard selection and snapshot vs live)
        
-   Shared test DSL helpers seed Budget + data + BudgetMonth rows.
    

```
