# PR 1: Backend Read-Only Next-Month Preview

## Goal

Add a safe backend endpoint that returns next-month preview numbers without creating or materializing a budget month.

## Scope In

- Add a read-only MediatR query slice for next-month preview.
- Add endpoint:

```http
GET /api/budgets/months/{fromYearMonth}/next-preview
```

- Derive `previewYearMonth` as `fromYearMonth + 1`.
- Read budget-plan/source rows only.
- Reuse existing backend dashboard projection math.
- Include explicit carry-over metadata.
- Return an unavailable/failure state when the source month is missing or not eligible.

## Scope Out

- No frontend page.
- No planned/draft month persistence.
- No editor changes.
- No budget-plan mutation.
- No use of `/api/budgets/dashboard?yearMonth={next}`.
- No materialization of month rows.

## Backend Files / Areas Likely Touched

- `Backend/Presentation/Controllers/Budget/*` for a new budget controller partial or lifecycle endpoint.
- `Backend/Application/Features/Budgets/Months/NextPreview/*` new feature slice.
- `Backend/Application/DTO/Budget/Months/NextMonthPreviewDto.cs` or nearby DTO folder.
- `Backend/Application/Abstractions/Infrastructure/Data/*` for preview read repository contract if existing seed-source repository is insufficient.
- `Backend/Infrastructure/Repositories/Budget/Months/Seed/*` or a dedicated preview read repository.
- `Backend/Application/Services/Budget/Projections/BudgetDashboardProjector.cs` only if projector needs a narrow extension.

## Frontend Files / Areas Likely Touched

None.

## Data Contracts / DTOs

Recommended DTO shape:

```csharp
public sealed record NextMonthPreviewDto(
    string FromYearMonth,
    string PreviewYearMonth,
    string State,
    string Basis,
    string CurrencyCode,
    NextMonthPreviewCarryOverDto CarryOver,
    BudgetDashboardDto Dashboard,
    IReadOnlyList<string> Limitations);

public sealed record NextMonthPreviewCarryOverDto(
    string Mode,
    decimal Amount,
    string Source,
    bool IsFinal);
```

Recommended values:

- `State = "preview"`
- `Basis = "budgetPlan"`
- `CarryOver.Mode = "none" | "estimatedFull"`
- `CarryOver.Source = "none" | "currentMonthLiveFinalBalance"`
- `CarryOver.IsFinal = false`

## Tests Required

- Endpoint does not insert into `BudgetMonth`.
- Endpoint does not insert month income/expense/savings/debt rows.
- Existing persisted month count remains unchanged after preview.
- Preview math reconciles through `BudgetDashboardProjector`.
- Negative live final balance floors estimated carry-over at zero.
- Empty budget plan returns clear empty/unavailable data, not fake numbers.
- Missing or inaccessible `fromYearMonth` fails safely.
- Authorization remains scoped to current user/persoid.

## Risks

- Accidentally calling lifecycle ensure/materialization code.
- Diverging preview math from normal dashboard math.
- Presenting estimated carry-over as final.
- Querying persisted month rows instead of budget-plan rows.

## Dependencies

None.

## Definition Of Done

- New endpoint exists and is documented by tests.
- Read-only contract is proven by integration tests.
- Preview numbers are backend-owned and projector-based.
- No next-month `BudgetMonth` is created by the request.
- Carry-over is explicitly marked estimated and non-final.

