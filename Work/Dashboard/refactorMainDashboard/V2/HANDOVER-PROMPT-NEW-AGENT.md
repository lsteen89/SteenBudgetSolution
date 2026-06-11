# Handover Prompt: Dashboard V2 Blueprint Review

You are a fresh reviewer/implementor agent taking over the Dashboard V2 visual alignment work.

The user will submit the standalone HTML file separately. Treat that HTML as the **visual blueprint** for the open-month dashboard. Your first job is to compare it objectively against the current repository implementation and the V2 audit, then decide the smallest safe implementation sequence that makes the real dashboard match the blueprint.

## Must Read First

Read these files before touching code:

1. `AGENTS.md`
2. `PROJECT.md`
3. `.agents/instructions/frontend-ui.instructions.md`
4. `Work/Dashboard/refactorMainDashboard/V2/DASHBOARD-V2-BLUEPRINT-GAP-AUDIT.md`
5. The standalone HTML file the user submits in this task.

Also inspect the current implementation directly:

- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/MoneyState.tsx`
- `Frontend/src/components/molecules/budget/AllocationBar.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/PlanningRow.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/AttentionLane.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/OpenMonthPillarWorkbench.tsx`
- `Frontend/src/components/organisms/dashboard/shell/MonthRail.tsx`

## Objective

Make the real dashboard match the standalone HTML blueprint much more closely while preserving financial correctness and the next-month roadmap guardrails.

This is not a vague polish pass. The current dashboard differs materially from the blueprint. You need to identify and fix those differences deliberately.

## Current Known Problem

The current dashboard is a hybrid:

- it copied concepts from the standalone;
- it missed important visual details;
- it added broader dashboard redesign pieces that were not clearly scoped;
- it does not render the dashboard-level next-month preview detail surface;
- it turns the MoneyState `Breakdown` action into a big CTA;
- it renders the allocation Flow bar as a generic rounded progress bar instead of the segmented blueprint bar;
- it keeps a broad `AttentionLane` instead of the clarified standalone insight/action cards.

Use the V2 audit as a starting hypothesis, not as a substitute for your own comparison against the HTML.

## Non-Negotiable Guardrails

Do not break these:

- No frontend-only next-month financial totals.
- No `/api/budgets/dashboard?yearMonth={next}` for unopened next-month preview.
- No read-only preview that inserts/materializes `BudgetMonth` rows.
- No next-month editing from current dashboard quick drawers.
- No arbitrary future-month routing.
- No nav/menu/account/global shell redesign.
- No transaction/spend/burn-rate/banking language.
- No new color system, typography system, or design language.
- Preserve closed/skipped read-only protection.
- Preserve current month as the primary dashboard answer.

## Scope For This V2 Pass

Implement dashboard visual alignment, not new product behavior.

Expected work areas:

1. **MoneyState**
   - Match the blueprint hierarchy.
   - Remove the visible default equation row if it is not in the blueprint.
   - Move `Breakdown` into the allocation header as a small ghost action.
   - Remove the large footer CTA.
   - Keep backend remaining as source of truth.

2. **Allocation Flow Bar**
   - Match the standalone segmented Flow bar: explicit gaps, small radii, correct height, correct palette, deficit marker.
   - Keep all math/reconciliation tests.

3. **Planning Row Cards**
   - Keep `This month`, `Next month`, `Budget plan`.
   - Match the HTML spacing, card opacity, borders, accent treatment, and CTA placement.
   - Next-month amount appears only from backend preview DTO.

4. **Dashboard Next-Month Preview Detail**
   - Add the standalone-style preview detail surface under the planning row when preview data exists.
   - Use the production-chosen comparison style from the submitted HTML.
   - Include carry-over assumption copy.
   - Include `How next month differs` only if the blueprint includes it and the data is backend-backed or safely derived from the preview DTO.

5. **Standalone Insight/Action Cards**
   - Replace the current broad help/explanatory area with the three standalone insight/action cards from the blueprint direction.
   - Do not keep the large `Värt en snabb koll` / `Uppmärksamhet` explanatory structure unless the submitted HTML explicitly requires that exact treatment.

6. **MonthRail**
   - Match the compact horizon-line feel.
   - Preview Next should remain a chevron with a subtle preview marker, not become a Sparkles-only button.
   - Preserve existing navigation behavior.

7. **Lower Dashboard Workbench**
   - If keeping the current workbench, align its surface grammar with the blueprint.
   - Do not add new data fetches.
   - Quick adjust remains current-month-only.

## Required Workflow

1. Read the standalone HTML and current React implementation.
2. Produce a short finding list before editing:
   - what differs visually;
   - what differs structurally;
   - what is intentionally out of scope.
3. Implement the smallest coherent V2 slice.
4. Run focused tests.
5. Use browser/visual verification for desktop and mobile dashboard states.
6. Update `docs/ai/ai-changelog.md`.
7. Write `COMMIT_MSG.tmp`.
8. Stop. Do not commit or push.

## Review Rejection Criteria

Reject or redo the implementation if:

- the MoneyState still has a large CTA where the blueprint has a small `Breakdown ->` action;
- the Flow bar still looks like one rounded progress pill;
- the dashboard still lacks the next-month preview detail surface;
- preview numbers are computed in the frontend instead of read from backend preview DTO;
- the old help/explanatory section remains instead of the standalone insight/action cards;
- MonthRail still feels like a heavy card rather than a compact rail;
- any nav/menu/global shell changes appear;
- quick drawer or dashboard cards imply unsupported future-month editing.

## Tone

Be direct. If the implementation has drifted from the blueprint, say so plainly. This pass is about getting the visual system stable and faithful to the submitted HTML.
