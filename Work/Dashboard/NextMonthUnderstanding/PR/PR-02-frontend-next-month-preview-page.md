# PR 2: Frontend Next-Month Preview Page

## Goal

Add `/dashboard/next-month` as a dedicated read-only preview page that consumes the PR 1 backend contract.

## Scope In

- Add frontend route `/dashboard/next-month`.
- Add query hook and API service method for `GET /api/budgets/months/{fromYearMonth}/next-preview`.
- Derive `fromYearMonth` from active/open month state.
- Render preview state clearly:
  - `June 2026 · Preview`
  - `Juni 2026 · Förhandsvisning`
- Show preview figures only from backend DTO.
- Show carry-over as estimated, not final.
- Add loading, error, unavailable, and empty states.
- Do not expose edit actions yet.

## Scope Out

- No dashboard layout changes.
- No MonthRail Next-button change.
- No planned-month creation.
- No editor links that imply next-month editing is supported.
- No frontend math for totals or carry-over.

## Backend Files / Areas Likely Touched

None, assuming PR 1 is merged.

## Frontend Files / Areas Likely Touched

- `Frontend/src/routes/appRoutes.ts`
- `Frontend/src/layout/AppRoutes.tsx`
- `Frontend/src/api/Services/Budget/budgetService.ts`
- `Frontend/src/hooks/budget/useNextMonthPreviewQuery.ts` new.
- `Frontend/src/types/budget/NextMonthPreviewDto.ts` new or existing budget types.
- `Frontend/src/Pages/private/dashboard/NextMonthPreviewPage.tsx` new.
- Dashboard i18n dictionaries.

## Data Contracts / DTOs

TypeScript mirror of PR 1:

```ts
export type NextMonthPreviewDto = {
  fromYearMonth: string;
  previewYearMonth: string;
  state: "preview";
  basis: "budgetPlan";
  currencyCode: string;
  carryOver: {
    mode: "none" | "estimatedFull";
    amount: number;
    source: "none" | "currentMonthLiveFinalBalance";
    isFinal: false;
  };
  dashboard: BudgetDashboardDto;
  limitations: string[];
};
```

## Tests Required

- Route renders and calls the new preview endpoint.
- Route never calls `/api/budgets/dashboard?yearMonth={next}`.
- Loading, error, unavailable, and success states render.
- Carry-over copy says estimated/non-final.
- No edit controls appear on the preview page.

## Risks

- Accidentally deriving preview numbers client-side.
- Using the wrong source month.
- Making preview look like the active/open month.
- Adding future edit affordances before backend supports them.

## Dependencies

- PR 1.

## Definition Of Done

- `/dashboard/next-month` exists.
- Page uses only backend preview data.
- Preview state is visually and textually distinct from open month.
- Unsupported edit actions are absent.

