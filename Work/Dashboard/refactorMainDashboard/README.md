# Work - Dashboard / Refactor Main Dashboard

Initial technical investigation for redesigning the main open-month dashboard.

Goal: give the designer enough truthful product and data context to design the
"ultimate MVP dashboard" without inventing unavailable data. If the design
requires data that is not listed here, the designer should explicitly request a
new or expanded endpoint before implementation starts.

## Read Order

1. `current-dashboard-analysis.md` - what the dashboard shows and lets users do today.
2. `endpoint-inventory.md` - available backend/API surface for dashboard, month lifecycle, and editor actions.
3. `designer-handoff.md` - practical design constraints, data boundaries, and likely endpoint gaps.
4. `HANDOVER-IMPLEMENTOR.md` - implementation prompt and slice plan after design handoff.
5. `HANDOVER-REVIEWER.md` - review prompt and rejection checklist.
6. `PROMPT-IMPLEMENTOR.md` - standalone copy-paste prompt for the implementation agent.
7. `PROMPT-REVIEWER.md` - standalone copy-paste prompt for the review agent.

## Current High-Level Shape

The main dashboard is not a pure static overview. It is a month command center:

- Select and navigate budget months.
- See open / closed / skipped lifecycle state.
- For open months, see remaining money, close readiness, follow-up prompts,
  and four financial pillars.
- Open quick editors for expenses, income, savings, and debts.
- Navigate to richer full editor pages for each pillar.
- Close the month from the period control bar when eligible.
- For closed months, show recap and a post-close handoff.
- For first-time users, launch the setup wizard instead of the dashboard.

## Source Files Inspected

Frontend:

- `Frontend/src/Pages/private/dashboard/dashboardhome.tsx`
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- `Frontend/src/components/organisms/dashboard/shell/*`
- `Frontend/src/components/organisms/dashboard/editPeriod/*`
- `Frontend/src/Pages/private/dashboard/DashboardBreakdownPage.tsx`
- `Frontend/src/Pages/private/{expenses,income,savings,debts}/*EditorPage.tsx`
- `Frontend/src/hooks/dashboard/*`
- `Frontend/src/hooks/budget/*`
- `Frontend/src/api/Services/Budget/*`
- `Frontend/src/types/budget/*`

Backend:

- `Backend/Presentation/Controllers/Budget/BudgetController*.cs`
- `Backend/Application/Features/Budgets/Dashboard/GetBudgetDashboardMonth/*`
- `Backend/Application/Services/Budget/Projections/BudgetDashboardProjector.cs`
- budget month lifecycle/editor DTOs and feature folders by route.

## Non-Goals For This Investigation

- No UI redesign implementation.
- No endpoint changes.
- No architecture changes.
- No visual prototype.
- No test run needed; this is documentation-only source analysis.
