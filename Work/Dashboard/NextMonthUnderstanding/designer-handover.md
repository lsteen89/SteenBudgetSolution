# Designer Handover

## Feature Intent

Working feature name: current month vs next month budget clarity.

The goal is to help users understand three things without turning the dashboard into a spreadsheet:

- `Denna manad`: what applies right now.
- `Budgetplan`: the normal monthly setup that future months start from.
- `Nasta manad`: what the next month will look like if nothing changes.

The current dashboard already works and has a good month-aware structure. Do not redesign everything.

## Current Dashboard Behavior

The dashboard shows a selected persisted budget month.

Current behavior:

- Open month: shows live dashboard totals from materialized month rows.
- Closed month: shows snapshot/recap, read-only.
- Skipped month: shows placeholder state, read-only.
- Month rail navigates existing persisted months only.
- Quick edit drawer edits the current open month only.
- Full editor pages may support budget-plan scopes where backend/domain supports it.
- Close-month flow can close the current month and create/configure the next month.

Important: unopened next month is not currently previewable with a safe backend endpoint.

## What Users May Misunderstand Today

Likely confusion:

- Whether the dashboard is "this month" or the reusable budget plan.
- Whether quick edits affect only this month or future months.
- Whether next month is already known before it is opened.
- What happens to the budget plan when a month-specific change is made.
- Whether closed months can still be edited.

The dashboard currently implies period state through the rail and labels, but it does not clearly teach the mental model:

```text
Budget plan -> materialized month -> month-specific edits -> closed snapshot
```

Use user language, not implementation language.

## Existing Data Support

Supported today:

- Current/open month dashboard numbers.
- Existing persisted month list.
- Closed month snapshot/recap.
- Skipped month state.
- Close/start month actions.
- Post-close handoff to the next created month.
- Row-level plan source metadata in editor APIs.

Not supported today:

- Safe preview of unopened next month.
- Base budget/plan dashboard summary.
- Dashboard-level current-vs-plan deltas.
- Dashboard-level "next month if nothing changes" totals.

## UX Direction

Preferred primary direction:

- One calm primary action, likely `Granska nasta manad` or `Forbered nasta manad`.
- Only show this when the action is backed by real behavior.
- If no backend preview exists, the action should lead into the existing close/preparation flow, not show fake preview numbers.

Good dashboard pattern:

- Keep current month as the main surface.
- Add a compact context layer that explains the relationship:
  - `Denna manad` = selected active month.
  - `Budgetplan` = normal setup used when a new month starts.
  - `Nasta manad` = only available as preview when backend supports it, or as opened month after close/start.
- Put deeper plan/current differences behind progressive disclosure or full editor routes.

## Copy Guidance

Use:

- `Denna manad`
- `Nasta manad`
- `Budgetplan`
- `Granska nasta manad`
- `Forbered nasta manad`
- `Galler denna manad`
- `Uppdatera budgetplanen framat`

Avoid:

- default
- baseline
- source
- entity
- override
- "AI coach" language
- guilt/shame language

Note: this handover uses ASCII spellings in the file. UI copy can use proper Swedish characters during implementation.

## States To Design For

### 1. User Has An Open Current Month

Data exists:

- `liveDashboard`
- month status `open`
- close eligibility metadata
- month rail/context

Design goal:

- Make clear this is the active month.
- Keep numbers primary.
- Keep editing affordances tied to current month.
- If plan-forward editing is mentioned, route to full editors.

Do not:

- Show next-month numbers unless backend preview exists.
- Put plan scopes into quick drawer.

### 2. User Has Not Opened Next Month Yet

Data exists:

- Current open month.
- Base plan rows exist in backend, but no dashboard summary endpoint.
- Month status list does not include unopened next month.

Design goal:

- Explain that next month starts from the budget plan.
- Offer one preparation direction if useful.

Do not:

- Pretend next month is in the month rail.
- Show a fake next-month card with calculated totals.

### 3. Next Month Can Be Previewed

This state requires new backend support.

Design should assume a future preview response can return:

- preview year-month
- basis: budget plan
- projected dashboard totals
- carry-over assumption/limitation
- warnings/limitations

Design goal:

- Label it as preview, not opened month.
- Show a compact comparison against current month.
- Make carry-over assumption visible but not noisy.
- Offer one next action: review plan, open/close month, or continue editing.

### 4. Next Month Cannot Be Previewed With Current Backend

This is the current reality.

Design goal:

- Keep dashboard honest.
- Use explanatory context, not fake numbers.
- If there is a CTA, it should go to existing behavior:
  - full budget editors for plan changes, or
  - close-month review when eligible.

Suggested empty/disabled framing:

- `Nasta manad skapas nar du stanger denna manad. Den bygger pa din budgetplan.`
- Avoid promising exact numbers.

### 5. Current Month Is Closed/Read-Only

Data exists:

- `snapshotTotals`
- recap endpoint
- possibly next persisted month in month status.

Design goal:

- Make closed/read-only state obvious.
- Keep recap as historical truth.
- Offer continue action only when next month exists.

Do not:

- Show edit affordances.
- Compare closed snapshot to mutable plan without explicit product decision.

## Component Reuse Notes

Potentially reusable:

- Month rail visual language.
- Money state/six-term equation layout.
- Open-month pillar cards.
- Close band/handoff language pattern.

Needs adaptation:

- Any preview state needs its own label/status so users do not confuse preview with opened month.
- Open-month cards need copy and affordance changes if reused for preview.
- Plan/current deltas should not appear unless backed by source-link metadata or a backend comparison DTO.

Do not reuse:

- Quick edit drawer for future-plan changes.
- Closed recap components for next-month preview.

## Design Principles For This Feature

- One primary action per view.
- Make money easy to scan.
- Keep the model understandable, not exhaustive.
- Use progressive disclosure for differences.
- Never imply a future month exists until it does.
- Never imply exact preview numbers until backend provides them.

