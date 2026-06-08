# Prompt - Implementor

You are implementing the open-month main dashboard refactor for
SteenBudgetSolution.

This is an implementation task. Read the required context first, then make the
smallest safe code changes needed for the sequence. Do not skip diagnosis.

## Required Context

Read these local files before editing code:

1. `AGENTS.md`
2. `PROJECT.md`
3. `.agents/instructions/frontend-ui.instructions.md`
4. `Work/Dashboard/refactorMainDashboard/README.md`
5. `Work/Dashboard/refactorMainDashboard/current-dashboard-analysis.md`
6. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`
7. `Work/Dashboard/refactorMainDashboard/designer-handoff.md`
8. `Work/Dashboard/refactorMainDashboard/PR-SEQUENCE.md`
9. `Work/Dashboard/refactorMainDashboard/HANDOVER-IMPLEMENTOR.md`

Fetch and inspect the design bundle:

```text
https://api.anthropic.com/v1/design/h/Cv7t6hvUuMlNMEbmxAoIBQ?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Read the design bundle README and these dashboard files:

- `explorations/dashboard/dashboard.html`
- `explorations/dashboard/dashboard-handoff.md`
- `explorations/dashboard/dashboard-pre-implementation-brief.md`
- `explorations/dashboard/sections.jsx`
- `explorations/dashboard/pillars.jsx`
- `explorations/dashboard/directions.jsx`
- `explorations/dashboard/data.jsx`
- `explorations/dashboard/shared.jsx`

The mockup is the visual and behavioural reference. It is not shippable code.
Do not port inline mock data, tweak panels, device frames, mock state toggles,
or prototype-only helpers.

## Inspect Current Code First

Inspect nearby existing dashboard code before editing:

- `Frontend/src/Pages/private/dashboard/dashboardhome.tsx`
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- `Frontend/src/components/organisms/dashboard/shell/*`
- `Frontend/src/components/organisms/dashboard/editPeriod/*`
- `Frontend/src/hooks/dashboard/*`
- `Frontend/src/hooks/budget/*`
- `Frontend/src/types/budget/*`
- existing dashboard tests under `Frontend/src/components/organisms/pages/__tests__/`
- existing dashboard hook tests under `Frontend/src/hooks/dashboard/`

Reuse existing patterns before creating new abstractions.

## Hard Constraints

Do not violate these:

1. This is a budgeting app, not a banking app. No transaction, spend-progress,
   "spent so far", burn-rate, due-date, or actual-bank-account language.
   Every figure is planned-budget data.
2. Money math is load-bearing and exact:
   `income + carryOver - expenses - savings - debts = remaining`.
   `remaining` must equal backend `finalBalanceWithCarryMonthly`.
3. Carry-over is its own equation term. Do not fold it into income.
4. Initial dashboard render may use only:
   - `GET /api/budgets/months/status`
   - `GET /api/budgets/dashboard?yearMonth={optional}`
5. Drawer/detail/editor reads must remain lazy-loaded on interaction.
6. Closed/skipped months expose zero edit affordances.
7. Quick-adjust drawers are bulk-patch only. Do not imply create, delete,
   lifecycle, transfer, archive, restore, or balance-adjust actions.
8. Client-derived attention ranking must be labelled as on-device guidance.
   Do not present it as backend-authored financial advice.
9. Deficit is clear but never shameful. Surplus is actionable, not noisy.
10. Use existing `eb-*` tokens, Inter, and i18n dictionaries. No new palette,
    no new font, no hardcoded user-facing strings.

If the design appears to need unavailable financial data, stop and document an
endpoint request under `Work/Dashboard/refactorMainDashboard/`. Do not fake a
number or write copy that implies unavailable facts.

## Locked Direction

Build the selected design direction:

- Spine layout, single narrative column.
- Section order:
  1. Month rail
  2. Money state anchor with inline allocation
  3. Conditional close band
  4. Attention lane capped at 3
  5. Pillar workbench, 2 by 2 on desktop and single-column on mobile
- Allocation visual: flow bar only.
- `/dashboard/breakdown` remains available, but the dashboard must explain the
  core allocation inline.

Do not implement Cockpit/two-pane. Do not add allocation visual toggles.

## Implementation Sequence

Follow `PR-SEQUENCE.md` / `HANDOVER-IMPLEMENTOR.md`:

- P0: shared AllocationBar and named dashboard terms aggregator
- P1: dashboard shell and MonthRail
- P2: MoneyState
- P3: pillar workbench
- P4: AttentionLane
- P5: CloseBand and full state matrix
- P6: close-month flow integration
- P7: endpoint request notes if real gaps appear

Keep slices independently verifiable. Do not do unrelated refactors.

## Validation Required

At minimum:

- unit tests for dashboard allocation/reconciliation
- unit tests for attention ranking
- focused dashboard component/hook tests for major states:
  - positive remaining
  - zero remaining
  - negative remaining
  - eligible close
  - overdue close
  - closed read-only
  - skipped read-only
  - quick-adjust lazy drawer behaviour
- `npm run build` from `Frontend/`
- focused frontend tests around dashboard/dashboard hooks
- browser or Playwright screenshots for desktop and mobile if available

Report exactly what was run and what remains unverified.

## Required Completion Steps

After implementation:

1. Append a short entry to `docs/ai/ai-changelog.md`.
2. Write a Conventional Commit message to `COMMIT_MSG.tmp`.
3. Stop. Do not commit or push.

## Output Expected

Summarize:

- changed files
- implemented slices
- validation run
- unverified risks
- any endpoint request notes added
