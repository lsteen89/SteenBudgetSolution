# Designer Handoff — Open-Month Dashboard Visual Polish

**Date:** 2026-06-08
**Audience:** the engineer/agent implementing the open-month dashboard polish pass in `SteenBudgetSolution`
**Status:** design exploration, ready for product review
**Scope:** purely **presentation** of the already-shipped open-month dashboard (Spine direction). No new data, no new endpoints, no money-math changes, no lifecycle changes.

---

## 0. Why this exists

The open-month dashboard refactor (the original `refactorMainDashboard` P0–P6 work) is **functionally correct and honest**: money reconciles, carry-over is its own term, the single dashboard read drives the page, drawers are lazy, attention ranking is on-device and labelled, closed/skipped months are read-only.

What it lost, relative to the designer mockup, is **visual density and confidence**. The mockup feels alive because almost every number sits on a proportional bar and the remaining anchor commands the page. The shipped version renders the same data as flat text rows with a timid hero. This is a **presentation gap, not a data gap** — every figure below already arrives on the existing `GET /api/budgets/dashboard` read, and every colour token already exists in `Frontend/src/index.css` / `Frontend/tailwind.config.js`.

This handoff defines a small, ordered set of visual polish PRs to close that gap **without touching the parts that are already correct**.

---

## 1. Design source of truth

The visual + behavioural reference is the same design bundle used for the original refactor. Fetch it, read the dashboard handoff, and mirror the **Spine** direction and the **PillarShell / MiniBar / GoalRow / flow-bar** grammar:

```text
https://api.anthropic.com/v1/design/h/TEinDTmhHl39ddMH5p6Kxw?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Read inside the bundle:

- `explorations/dashboard/dashboard-handoff.md` — §3.2 MoneyState, §3.4 Pillar workbench, §7 reuse notes.
- `explorations/dashboard/sections.jsx` — `AllocFlow` (flow bar + legend), `MoneyState` (hero scale + tone word).
- `explorations/dashboard/pillars.jsx` — `PillarShell`, `MiniBar`, `GoalRow`, debt rows.
- `explorations/dashboard/shared.jsx` — `Surface` (glass card recipe), `Money`, `Kicker`.

The mockup is a **fidelity reference, not shippable code.** Do not port inline mock data (`DASH_STATES`), the tweaks panel, the device frame, or the inline styles. Rebuild with the existing React/TS components, `eb-*` tokens, Inter, and the existing i18n dictionaries. When the mockup and local repo reality disagree, **financial honesty and the existing token system win.**

---

## 2. What is already correct — do NOT change

These are out of scope. Touching them is a review rejection:

- `buildDashboardTerms` / `dashboardTerms.ts` reconciliation and the six-term equation source values.
- `remaining` = backend `finalBalanceWithCarryMonthly`. Never re-derive it.
- Carry-over as its own term, never folded into income.
- Single dashboard read + lazy drawers. No editor endpoints on load.
- `attentionRanking.ts` logic, the cap of 3, and the "How these are chosen" disclosure.
- `closeBandState.ts` resolution and `max(remaining, 0)` carry-forward preview.
- Read-only branching for closed/skipped months (handled upstream in `DashboardContent`).
- Close-month flow wiring (`CloseMonthReviewModal`).
- Section order: MonthRail → MoneyState → CloseBand → AttentionLane → PillarWorkbench.

This is a **reskin of the bodies**, not a re-architecture.

---

## 3. The eight gaps, grouped into PRs

| # | Gap | Mockup | Shipped | Data source (already present) |
|---|-----|--------|---------|-------------------------------|
| 1 | Pillar bodies are flat text | every row on a proportional `MiniBar` | `SignalRow` label+value text | `breakdown.incomeItems`, `breakdown.expenseCategoryItems` |
| 2 | Savings shows an aggregate | top-3 **goal rows** w/ per-goal progress | one combined bar + "N active goals" | `dashboardMonth.liveDashboard.savings.goals[]` |
| 3 | Debts shows an aggregate | **debt rows**: name, APR, balance bar, monthly | monthly + balance + strategy chip | `dashboardMonth.liveDashboard.debt.debts[]` (`name`, `apr`, `balance`, `monthlyPayment`) |
| 4 | AllocationBar has no legend | dots + labels + amounts above the bar | one-line caption, unlabeled segments | `terms` already passed to `AllocationBar` |
| 5 | Hero is timid | remaining at ~52px + a tone word inline | `text-3xl/4xl`, no tone word | `terms.remaining` + tone classifier (exists) |
| 6 | Allocation colours signal alarm | calm navy→blue→amber→green | expenses = **danger red** | tokens `shell-3/shell-2/warning/accent` |
| 7 | Redundant "why" | paragraph + clean flow bar | bordered equation chip row **and** the bar | n/a (presentation) |
| 8 | Surface inconsistency | one glass `Surface` everywhere | pillars flat `bg-white/75` | n/a (presentation) |

**Data confirmation:** `DashboardDebtItemDto` = `{ id, name, type, balance, apr, monthlyPayment }`; `DashboardSavingsGoalDto` = `{ id?, name?, targetAmount?, amountSaved?, monthlyContribution, isFavorite? }`. Every bar the designer wants is fully backed by the current read. **No endpoint requests are required for this work.**

---

## 4. PR sequence (locked)

Five small, independently verifiable slices. Order is by impact; the last is the visual regression net.

### DP1 — Pillar workbench density (the big win)
Reintroduce proportional bars and per-item rows inside `OpenMonthPillarWorkbench` / `PillarWorkbenchCard`.

- **Income:** salary / household / side as `MiniBar` rows (label, amount, proportional fill against the largest of the three). Source `breakdown.incomeItems` grouped exactly as today (`:salary`, `:member:`, `:side:`).
- **Expenses:** top-3 `expenseCategoryItems` as `MiniBar` rows (proportional against the largest category). Keep the existing subscription / recurring pressure chips below a divider.
- **Savings:** top-3 **goal rows** — name (favorite dot if `isFavorite`), `%` of target, a per-goal progress bar, and `saved of target · monthly/mo` sub-line. Keep base-saving / goal-contribution totals as a header sub-line (`{base} base + {goals} goals`). Drop the single aggregate progress bar in favour of the per-goal rows. Goals with no target render saved/contribution without a percentage (no divide-by-zero).
- **Debts:** **debt rows** — name, `apr%` label, a balance bar (proportional against the largest balance), and `balance · monthly/mo` sub-line. Keep total monthly + total balance + strategy chip as header/sub context.
- **Empty/zero states unchanged in meaning:** a pillar with no data keeps its existing calm single-line empty state (no skeleton bars, no zero-width bars).

Out of scope: no new fields, no editor reads, no change to the quick-adjust vs editor footer actions.

### DP2 — AllocationBar legend + calm palette
- Add a legend above the bar: a coloured dot + label + **amount** per visible segment (Expenses / Savings / Debts / Free), driven by the same `terms` the bar already receives. Legend strings come from the existing `MoneyState.i18n` allocation labels — reuse, do not add a parallel set.
- Recolour the flow segments to the calm allocation palette: **Expenses = `eb-shell-3` (navy), Savings = `eb-shell-2` (blue), Debts = `eb-warning`/`eb-alert` (amber), Free = `eb-accent` (green).** Expenses must stop reading as danger red — expenses are planned, not alarming.
- Keep the deficit treatment exactly as-is: the runs-out marker and the hatched unfunded tail stay `eb-danger`. Deficit honesty does not change.

Out of scope: no change to the bar's math, denominator logic, or deficit reconciliation.

### DP3 — MoneyState hero + simplified "why"
- Scale the remaining anchor up to a true hero (mockup uses ~52px desktop / ~40px compact; pick the nearest existing type step that reads as the dominant element on the page) and place the **tone word** inline next to it: surplus → "free to allocate", zero → "every krona is assigned", deficit → "short". All three strings via the existing dictionary.
- Make the flow bar (now with its DP2 legend) the **primary** inline explanation. Lighten or remove the bordered equation chip row so MoneyState has **one** clear "why", not two competing ones. If the six-term equation is retained, demote it visually (quiet inline text, not a row of bordered cells) so it supports rather than competes with the bar.
- Keep the `Breakdown` link to `/dashboard/breakdown` as a secondary affordance.

Out of scope: the equation **values** and reconciliation are untouchable; only their visual weight changes.

### DP4 — Surface cohesion
- Move the pillar cards onto the shared glass surface language used by the rest of the dashboard (the `eb-surface` / `shadow-eb` / radius-24 recipe), replacing the flat `bg-white/75 rounded-2xl`. Prefer the existing `SurfaceCard` / `CardShell` primitive if it already encodes this recipe; otherwise match its tokens. One surface recipe across MoneyState, CloseBand, AttentionLane, and the pillars.

Out of scope: no new shadow/blur tokens; reuse what exists.

### DP5 — Playwright visual + E2E regression (last PR)
Lock the polished look against regression. See the implementor handover for the exact scenario list. This PR adds tests only — no further component changes.

---

## 5. Honesty + constraint gate (unchanged from the original)

- Budgeting app, not banking: no transaction / spend-progress / "spent so far" / burn-rate / due-date language. Every figure is planned-budget.
- `income + carryOver − expenses − savings − debts = remaining`, reconciling to backend `finalBalanceWithCarryMonthly`.
- Carry-over is its own term.
- Quick-adjust drawers stay bulk-patch only; no create/delete/lifecycle implied.
- Attention ranking stays on-device and labelled.
- Closed/skipped months expose zero edit affordances.
- `eb-*` tokens + Inter + i18n dictionaries only. No new colour system, no new font, no hardcoded user-facing strings.

If any visual detail appears to need data not on the current read, **stop and document an endpoint request** in this folder rather than faking a number. (None is expected — §3 confirms full data coverage.)

---

## 6. Acceptance criteria

- [ ] Each pillar shows a real, proportional breakdown (bars), not flat text.
- [ ] Savings shows individual goal rows with progress; debts show individual rows with APR + balance bar.
- [ ] AllocationBar has a labelled legend with amounts; segments use the calm navy/blue/amber/green palette; expenses are no longer red.
- [ ] Deficit treatment (runs-out marker, unfunded tail, no shame copy) is unchanged.
- [ ] The remaining anchor reads as the dominant element on the page, with an inline tone word.
- [ ] MoneyState presents one clear "why", not two competing representations.
- [ ] All dashboard cards share one glass surface recipe.
- [ ] No money-math, reconciliation, lazy-load, attention-ranking, close-flow, or read-only behaviour changed.
- [ ] All new strings route through existing i18n dictionaries (EN/SV/ET).
- [ ] Desktop (≤1180px content) and mobile (single column, ≥44px targets) both pass; reduced-motion respected.
- [ ] Playwright visual/E2E scenarios (DP5) cover the key states.

*Build to the mockup for look; when the mockup and this document disagree, this document wins; when this document and backend reality disagree, financial honesty wins.*
