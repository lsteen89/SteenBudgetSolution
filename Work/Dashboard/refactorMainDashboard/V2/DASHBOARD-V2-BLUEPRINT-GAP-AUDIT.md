# Dashboard V2 Blueprint Gap Audit

Date: 2026-06-11  
Role: reviewer / implementation brief  
Blueprint source: `/Users/linussteen/Downloads/eBudget Dashboard (standalone).html` and the tar handoff dashboard exploration.

## TLDR

The current dashboard does **not** look like the standalone HTML because it is a hybrid:

- it copied several blueprint ideas;
- it ignored or softened many of the blueprint's exact visual rules;
- it implemented broader dashboard pieces that were later declared out of scope;
- it skipped the dedicated next-month preview detail surface that makes the planning row feel intentional;
- it kept/rebuilt the old explanatory `Värt en snabb koll` / `Uppmärksamhet` concept as a bigger `AttentionLane` instead of replacing it with the approved standalone insight/action cards.

Blunt answer: this is not a polish problem. The current page is structurally and visually different from the blueprint.

## Current Branch Reality

Branch: `feature/nextMonthPreview`

Relevant commits already present:

- `505825aa` — backend read-only next-month preview endpoint.
- `cda36af3` — frontend `/dashboard/next-month` preview page.
- `b1f7c75d` — planning row on dashboard.
- `fa0e89cc` — planned month lifecycle.
- `831e132a` — selected-month editor support.

Current uncommitted work exists in PR-7 preview/planned page files. This audit intentionally does not modify those files.

## Blueprint We Are Actually Targeting

The standalone HTML default is:

- `direction: "spine"`
- `monthState: "surplus"`
- `allocationViz: "flow"`
- `nextMonth: "preview"`
- `modelStyle: "row"`
- `previewCompare: "deltas"`
- `viewport: "desktop"`

The chosen dashboard anatomy is:

1. Month rail.
2. Current-month MoneyState hero.
3. Planning row cards: `This month`, `Next month`, `Budget plan`.
4. Next-month preview detail surface when preview data exists.
5. Standalone insight/action cards replacing the old explanatory/help panel.
6. Existing lower dashboard areas, only if they are intentionally kept or visually aligned.

The clarified scope names are:

- **Planning row cards** = `This month` / `Next month` / `Budget plan`.
- **Standalone insight/action cards** = three cards replacing the current explanatory/help panel underneath the next-month preview card.

## Major Missing / Wrong Pieces

### 1. MoneyState Does Not Match The Blueprint

Blueprint:

- Large remaining number inside one quiet glass surface.
- Kicker reads like `Open month · 1-31 May`.
- Hero copy is compact: `This is what stays free after your whole plan...`
- Allocation section is separated by a top border.
- Allocation header has:
  - left: `Where the month goes`
  - right: small ghost `Breakdown →`
- No large footer CTA.
- No prominent equation line.
- Flow bar is the main explanation.

Current React:

- Kicker is a pill-like `Money state`.
- Label is `Left this month`, which changes the information hierarchy.
- Adds a full six-term equation row above the allocation bar.
- Adds a footer hint plus a large CTA: `See the full breakdown`.
- This makes the allocation area read like a CTA block instead of a calm inline explanation.

Required V2 change:

- Keep the backend reconciliation helper/test, but remove the visible equation row from the default dashboard surface.
- Move `Breakdown →` into the allocation header as a small ghost action.
- Remove the footer hint and big CTA from MoneyState.
- Match the blueprint wording and hierarchy.

### 2. The Flow Bar Is Not The Blueprint Flow Bar

Blueprint flow bar:

- Height around 16px.
- Segments separated by small gaps.
- Segments have small rectangular radii, not a single pill.
- Legend and bar are one visual unit.
- Segment palette:
  - expenses: deep navy
  - savings: bright blue
  - debts: amber
  - free: green
- Deficit marker is a thin danger line where money runs out.

Current `AllocationBar`:

- Uses a single rounded-full track.
- Segments touch inside one pill.
- Has inset separator shadows rather than explicit gaps.
- Deficit overlay is more complex and not the same visual as the standalone.
- Bar height/radius makes it feel like a generic progress bar, not the mockup's segmented allocation strip.

Required V2 change:

- Add a `flow` variant that exactly matches the standalone visual.
- Use explicit segment gaps and small segment radii.
- Keep the existing math contract, but change the visual grammar.
- Do not make this a user-selectable allocation visual. The shipped visual is Flow bar only.

### 3. Planning Row Exists, But It Is Only Half The Blueprint Layer

Current `PlanningRow` correctly adds three cards and gates next-month numbers behind the backend preview DTO. Good.

But it is incomplete against the blueprint.

Blueprint:

- Planning row is followed by `NextMonthDetail` when preview is available.
- The detail surface provides evidence for the next-month number:
  - `Next month preview` kicker
  - Preview pill
  - period label
  - default `deltas` comparison
  - carry-over assumption line
  - expandable `How next month differs`

Current React:

- Renders only the three planning cards.
- Does not render a dashboard-level next-month preview detail/card under the planning row.
- The only fuller preview is the separate `/dashboard/next-month` page.

Required V2 change:

- Add a dashboard `NextMonthPreviewDetail` surface under the planning row when preview data is available.
- It must use backend preview DTO values only.
- It must not call `/api/budgets/dashboard?yearMonth={next}`.
- It must not materialize a month.
- It must not expose edit controls.
- If preview is unavailable, omit numbers and render the approved unavailable state.

### 4. The Next-Month CTA Destination Is Correct, But The Prototype Interaction Is Not

Blueprint:

- Planning row card B carries one full-width primary CTA: `Review next month`.
- Optional detail surface has a small ghost `Open full preview` action.
- Rail Next button:
  - preview mode: chevron button with accent treatment and a small sparkle dot
  - persisted mode: normal next chevron
  - unsupported: dimmed/locked

Current React:

- Planning card CTA routes correctly.
- Rail Next uses a Sparkles icon instead of the chevron + small sparkle overlay.
- Rail is also wrapped in a larger card-like container, changing the visual weight.
- There is no dashboard `Open full preview` action because the detail surface is missing.

Required V2 change:

- Keep the routing behavior from PR 4.
- Change the rail affordance to match the standalone: chevron remains the primary icon, sparkle becomes a small overlay/status marker.
- Add the small ghost detail-surface action if the preview detail is present.

### 5. MonthRail Is Visually Too Heavy

Blueprint:

- Rail reads as a horizon line, not a full card.
- Prev/next are compact icon buttons.
- Month label and status sit inline.
- Archive is a compact secondary control.
- Close readiness is quiet on the right.

Current React:

- Entire rail is a rounded-3xl white/glass card.
- Buttons are larger and label-heavy on desktop.
- The rail competes with MoneyState instead of introducing it.

Required V2 change:

- Reduce rail chrome.
- Remove the large card feeling.
- Match compact icon-button rhythm.
- Preserve archive, accessibility, close readiness, and persisted/preview next behavior.

### 6. Standalone Insight/Action Cards Are Not Implemented As Scoped MVP Cards

Clarified PR-3 scope:

- Replace the current large explanatory/help area:
  - `Värt en snabb koll`
  - `Uppmärksamhet`
  - collapsible explanatory UI
- Use three standalone insight/action cards underneath the next-month preview card.
- Keep it narrow.

Current React:

- Implements `AttentionLane`, a broader ranking system.
- Still uses `sectionTitle: "Värt en snabb koll"` and `sectionEyebrow: "Uppmärksamhet"` in Swedish.
- Includes `How these are chosen` details.
- Is placed after `CloseBand`, not directly under the next-month preview surface.
- It is a full dashboard system, not the scoped standalone insight/action card replacement.

Required V2 change:

- Replace `AttentionLane` in the dashboard flow with `StandaloneInsightActionCards`.
- Place those cards directly under the next-month preview detail/surface.
- Remove the old explanatory heading/collapsible framing from this dashboard area.
- Keep ranking/heuristics simple and testable, but do not expose a big explanatory mechanism unless explicitly designed.
- If backend-owned action severity is missing, keep copy factual and avoid pretending it is backend advice.

### 7. Lower Dashboard Workbench Drifted Into Scope

Clarified out-of-scope list said:

- no full PillarWorkbench redesign;
- no broader AttentionLane system;
- no broad MoneyState redesign.

Current React already contains:

- `OpenMonthPillarWorkbench`
- dense pillar cards
- `PillarWorkbenchCard`
- `PillarRows`
- broad `AttentionLane`
- broad `MoneyState` rebuild

This is why the page feels neither like the original dashboard nor like the standalone blueprint. It is the middle state.

Required V2 decision:

- Option A: strict next-month MVP only
  - Revert or hide broad MoneyState / AttentionLane / PillarWorkbench changes.
  - Implement only planning row, next-month preview detail, and standalone insight/action cards.
- Option B: true dashboard V2 visual alignment
  - Keep the broader components, but make them match the standalone exactly.
  - This is larger than PR 3 and must be treated as a dashboard V2 refactor, not a next-month PR.

Given the user's final direction, choose Option B for this V2 refactor.

### 8. Card Surface Grammar Is Inconsistent

Blueprint primitives:

- `Surface`: `border-radius: 24px`, `bg surface / 0.9`, `border stroke / 0.4`, `shadow-eb`, top-down sheen.
- `ModelCard`: `border-radius: 18px`, `padding: 14px 15px`, neutral card `surface / 0.62`, accent card `surface / 0.96`.
- `Pill`: small, compact, softer.
- `Btn`: `height: 34px` for small actions; full-width only where the blueprint makes it a primary card CTA.

Current React:

- Uses a shared `dashboardSurfaceNeutral` on too many elements.
- Uses `rounded-3xl` broadly, including where blueprint uses smaller 18px cards.
- Uses full CTA styles in places where blueprint uses ghost text actions.
- Planning cards are close, but not exact.

Required V2 change:

- Create or refactor to a small set of dashboard-local primitives matching the standalone:
  - `DashboardSurface`
  - `DashboardKicker`
  - `DashboardPill`
  - `DashboardButton`
  - `ModelCard`
- Do not invent new colors or radii. Use the existing `eb-*` tokens.
- Do not wrap cards inside cards.

### 9. Copy Does Not Match The Blueprint Rhythm

Blueprint copy is short and quiet.

Examples:

- `Open month · 1-31 May`
- `Where the month goes`
- `Breakdown →`
- `free to allocate`
- `This month`
- `Next month`
- `Budget plan`
- `Review next month`
- `Based on May closing with X left. Amounts are set when the month closes.`

Current copy is more explanatory:

- `Money state`
- `Left this month`
- `How this month's money is allocated`
- `Categories, recurring costs, subscriptions, goals and debts.`
- `Worth a quick look`
- `A short list of items derived from this month's planned numbers.`
- `How these are chosen`

Required V2 change:

- Shorten dashboard copy to the standalone rhythm.
- Keep explanations on hover/details only where required for honesty.
- Swedish/English/Estonian dictionaries must remain complete.

### 10. Preview Compare Variant Is Missing From Dashboard

Blueprint default in the attached standalone is `previewCompare: "deltas"`.

The available blueprint comparison styles were:

- `sidebyside`
- `deltas`
- `card`

For production we should not ship this as a user tweak. We need one chosen variant.

Required V2 change:

- Implement only one production variant.
- Use `deltas` unless product explicitly chooses `card`.
- Do not expose a runtime toggle.
- Ensure delta math reconciles to the preview DTO and never frontend-fabricates preview totals.

## What Must Not Change

Do not use this V2 refactor as permission to add unrelated behavior.

Still forbidden:

- menu/nav redesign;
- account/global shell changes;
- arbitrary future-month routes;
- frontend-only next-month totals;
- `GET /api/budgets/dashboard?yearMonth={next}` as preview;
- preview materialization;
- next-month editing from dashboard cards before planned-month state is explicit;
- quick drawer future-month editing;
- transaction/spend/burn-rate language;
- bank integration concepts;
- AI advice cards.

## Required V2 Implementation Shape

### Phase V2-1: Freeze Blueprint Primitives

Add dashboard-local primitives that match the standalone visual grammar.

Files likely touched:

- `Frontend/src/components/organisms/dashboard/returning/openMonth/dashboardSurface.ts`
- possibly new `DashboardPrimitive.tsx` or colocated helpers under `openMonth/`

Acceptance:

- Surfaces, cards, pills, small buttons match standalone dimensions and opacity.
- No new token system.
- No broad app shell changes.

### Phase V2-2: Rebuild MoneyState To Match Standalone

Files likely touched:

- `MoneyState.tsx`
- `MoneyState.i18n.ts`
- `AllocationBar.tsx` or a dashboard-specific Flow-bar adapter
- `MoneyState.test.tsx`

Acceptance:

- No visible equation row in the default MoneyState.
- Allocation header includes ghost `Breakdown →` action.
- No footer CTA.
- Flow bar matches segment gaps, height, radii, and deficit marker.
- Backend remaining remains source of truth.
- Reconciliation stays tested.

### Phase V2-3: Add Dashboard Preview Detail Surface

Files likely touched:

- `PlanningRow.tsx`
- new `NextMonthPreviewDetail.tsx`
- `PlanningRow.i18n.ts`
- `PlanningRow.test.tsx`
- `ReturningDashboardSection.tsx`

Acceptance:

- Planning row remains three cards.
- Preview detail renders below it only with valid preview data.
- Detail includes preview kicker, preview pill, period label, chosen comparison, carry-over assumption, and `How next month differs`.
- No preview data means no fake numbers.
- No edit controls.

### Phase V2-4: Replace AttentionLane With Standalone Insight/Action Cards

Files likely touched:

- new `StandaloneInsightActionCards.tsx`
- `AttentionLane.tsx` may be removed from the main open dashboard flow or retained only if another page needs it.
- `AttentionLane.i18n.ts` or new i18n file.
- `ReturningDashboardSection.tsx`

Acceptance:

- Cards sit under the next-month preview detail.
- Old `Värt en snabb koll` / `Uppmärksamhet` explanatory area is gone from the main dashboard.
- No collapsible explanatory UI in the default card area.
- Cards are compact, standalone, action-oriented.
- Max three cards.

### Phase V2-5: Align MonthRail

Files likely touched:

- `MonthRail.tsx`
- `DashboardContent.tsx`
- `DashboardHeader.i18n.ts`
- `MonthRail.test.tsx`

Acceptance:

- Rail reads as a compact horizon line, not a big card.
- Preview Next uses chevron + small sparkle marker.
- Persisted Next remains normal.
- Unsupported Next is dimmed/locked.
- Archive and close readiness remain.

### Phase V2-6: Decide Lower Workbench Treatment

Because current React already has a workbench, do not leave it half-aligned.

Preferred V2 decision:

- Keep the existing workbench behavior.
- Visually align card shell, row spacing, header amount placement, footer buttons, and mini bars to the standalone.
- Do not add new data or behavior.

Acceptance:

- The lower dashboard no longer looks like a separate design system.
- Quick adjust remains current-month-only.
- Editor routes remain unchanged.

## Review Checklist For The Final V2 PR

Reject the PR if any of these are true:

- MoneyState still has a large `See full breakdown` CTA.
- Flow bar still renders as one rounded pill track.
- Visible equation row remains in default MoneyState.
- Planning row appears without a preview detail surface when valid preview data exists.
- Preview detail computes money in frontend instead of reading backend preview DTO.
- Standalone insight/action cards are replaced by a broad `AttentionLane` section.
- `Värt en snabb koll` / `Uppmärksamhet` still appears as the dashboard's main help/explanation area.
- MonthRail preview Next replaces the chevron with Sparkles instead of using a subtle marker.
- Any next-month preview path calls `/dashboard?yearMonth={next}`.
- Any edit affordance appears on read-only preview unless planned-month lifecycle is explicitly active.
- Quick drawer edits future/planned month from the current dashboard.
- Nav/menu/account/global shell changes sneak in.

## Validation Required

Minimum validation:

- Unit tests:
  - MoneyState reconciliation still passes.
  - Flow bar segment visibility and deficit marker.
  - Planning row preview/unavailable/persisted states.
  - Preview detail uses provided DTO only.
  - Standalone insight/action cards max at three and render in the correct order.
  - MonthRail preview/persisted/disabled next states.
- Visual/browser validation:
  - desktop dashboard screenshot compared against standalone.
  - mobile dashboard screenshot, no overlapping text.
  - preview unavailable state.
  - deficit state.
  - close eligible/overdue state.
- Explicit check:
  - no calls to `/api/budgets/dashboard?yearMonth={next}` for preview.
  - no frontend aggregation of next-month totals.
  - no editor endpoints fetched on dashboard load.

## Final Reviewer Position

The current dashboard is not acceptable as the final design because it is neither:

- the narrow next-month MVP we clarified, nor
- the visual dashboard V2 from the standalone HTML.

V2 should intentionally move to the second option: make the open-month dashboard match the standalone blueprint visually while preserving the next-month roadmap guardrails.

No more half-port.
