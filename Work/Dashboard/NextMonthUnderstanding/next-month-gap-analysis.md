# Next Month Gap Analysis

## Summary

The current system is solid for persisted month lifecycle: open, close, skipped, snapshots, and current-month editing. It is not yet built for a safe, read-only "next month if nothing changes" preview.

The main missing piece is not a visual card. It is a backend contract that can answer:

```text
Given the current base budget plan and optional carry-over assumption,
what would next month look like without creating or mutating a BudgetMonth?
```

Without that, the frontend should not fake next-month clarity.

## Already Supported

| Capability | Notes |
| --- | --- |
| Current open month dashboard | `GET /api/budgets/dashboard` returns live data for open month. |
| Existing month selector | `GET /api/budgets/months/status` returns persisted months for rail/archive. |
| Closed month read-only view | Dashboard snapshot and recap branch already exist. |
| Skipped month read-only state | Dashboard handles skipped status explicitly. |
| Close current month and create/configure next month | `POST /api/budgets/months/{yearMonth}/close`. |
| Explicit start target month | `POST /api/budgets/months/start`. |
| Month materialization from base plan | `BudgetMonthMaterializer` copies active base rows into month rows. |
| Current vs plan links in editor data | Editor DTOs expose source IDs, `isMonthOnly`, `canUpdateDefault`, and some source values. |
| Plan-forward writes in full editor flows | Supported where source links and command scopes support it. |

## Supported With Small Frontend Changes

These changes use existing data honestly and do not require new backend behavior.

| Gap | Small frontend change |
| --- | --- |
| Users may not know the dashboard is showing the selected/open month | Add clearer period context around the existing month rail/header. |
| Users may not know closed/skipped months are read-only | Existing branches can strengthen labels/copy without new data. |
| Users may not understand quick drawer is current-month-only | Existing copy already says this in drawer tests; could be surfaced more consistently. |
| Users need one primary direction near month-end | Existing close action and `CloseBand` can be tuned to "Review/prepare next month" language when eligible. |
| Users need to see that next month exists after close | Existing `ClosedMonthHandoffCard` and continue action can be refined. |

Strict limit: frontend-only work can explain current persisted state. It cannot claim an unopened next month has been calculated.

## Supported With Backend Changes

### 1. Read-Only Next-Month Preview Endpoint

Recommended backend addition for MVP:

```http
GET /api/budgets/months/{yearMonth}/next-preview
```

or:

```http
GET /api/budgets/next-month-preview?fromYearMonth=YYYY-MM
```

It should:

- Not insert `BudgetMonth`.
- Not materialize month rows.
- Read active base-plan rows.
- Apply known domain filters consistently.
- Accept or derive a carry-over assumption.
- Return enough DTO shape for a compact dashboard preview.

Possible response shape:

```ts
type NextMonthPreviewDto = {
  fromYearMonth: string;
  previewYearMonth: string;
  basis: "budgetPlan";
  carryOver: {
    mode: "none" | "full" | "custom" | "unknown";
    amount: number | null;
    source: "assumption" | "currentMonthFinalBalance" | "notAvailable";
  };
  dashboard: BudgetDashboardDto;
  limitations: string[];
};
```

The exact shape should be decided with implementation, but it must clearly mark that this is a preview, not an opened month.

### 2. Base Budget Summary/Plan Endpoint

Alternative or companion endpoint:

```http
GET /api/budgets/plan/summary
```

This would answer "your normal monthly setup" directly. It can be simpler than next-month preview and may be enough for dashboard education.

### 3. Pure Projection Service

Current reusable projection assumes a `BudgetDashboardReadModel`. The backend needs either:

- a read model builder from base-plan rows, or
- a dedicated plan/preview projector that shares calculation rules with `BudgetDashboardProjector`.

Do not reuse `BudgetMonthMaterializer` for preview. It mutates.

### 4. Carry-Over Contract

Next-month preview needs product/backend agreement on carry-over:

- If current month is open, final balance can change.
- "Full carry-over" is not fixed until close snapshot.
- Preview must label carry-over as estimated or excluded.

MVP recommendation: start with "budget plan without carry-over" or "assuming no carry-over" unless product explicitly wants estimated carry-over.

### 5. Comparison Metadata

If the dashboard should show "this month differs from the plan", backend needs dashboard-level comparison data or a compact delta endpoint. Current editor endpoints have row-level source data, but dashboard cards do not.

## Requires Product Decision

| Decision | Why it matters |
| --- | --- |
| Is "next month" shown before close, or only in the close flow? | Determines whether this belongs on dashboard always or near month-end only. |
| Should preview include carry-over? | Carry-over is uncertain until close. Bad copy here will mislead users. |
| What does "budget plan" mean in UI? | Users need "normal monthly setup", not implementation terms like baseline/default/source. |
| Should "Prepare next month" open a read-only preview, a close modal, or a planning editor? | These are different user intents. One primary action is needed. |
| How much plan comparison is necessary for MVP? | Full row-by-row diff is more expensive than a compact summary. |
| Should editing the plan from dashboard be allowed? | Quick drawer contract says no; full editors already own plan scopes. |

## Not Recommended For MVP

| Idea | Why not |
| --- | --- |
| Use `GET /dashboard?yearMonth={next}` as preview | It can create/materialize a month. That is not preview. |
| Frontend aggregate next month from editor APIs | Duplicates financial logic, risks drift, and may miss domain filters. |
| Add future-plan controls to quick drawer | Violates current UX contract. Quick drawers are current-month-only. |
| Show full row-level plan/current/next diff on dashboard | Too much cognitive load for MVP. Better behind progressive disclosure. |
| Auto-open next month just so it can be shown | Violates lifecycle docs and product expectation. Opening is a real state change. |
| Fake "next month can be previewed" with static explanatory copy | Explanatory copy is fine, but do not present numbers as calculated if backend did not calculate them. |

## MVP Recommendation

1. Improve dashboard context using existing data:
   - "Denna månad" for selected open month.
   - "Budgetplan" as explanatory language only where no numbers are claimed.
   - "Nästa månad" only when the next month exists or a real preview endpoint exists.
2. Add a backend read-only next-month preview endpoint before rendering next-month numbers.
3. Keep the primary action singular:
   - before close eligibility: "Review budget plan" or similar, if it routes to full editors.
   - near close eligibility: "Review next month" or "Prepare next month", backed by preview or close flow.
4. Keep plan editing in full editor pages, not the dashboard quick drawer.

## Risk Assessment

| Risk | Severity | Mitigation |
| --- | --- | --- |
| User thinks next month is already opened | High | Distinguish preview vs opened month in DTO and UI copy. |
| Financial totals drift between dashboard and preview | High | Backend owns preview math. |
| Carry-over promise is wrong | High | Treat carry-over as assumption until close snapshot. |
| Month-only rows are shown as plan rows | High | Require source-link metadata for plan comparisons. |
| Dashboard becomes too busy | Medium | Use one primary action and progressive disclosure. |

