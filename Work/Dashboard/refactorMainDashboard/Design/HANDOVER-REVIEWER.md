# Handover — Reviewer (Dashboard Visual Polish)

You are reviewing the **visual polish pass** for the already-shipped open-month
dashboard. This is a reskin of section bodies, not a re-architecture. The bar for
acceptance: the look matches the designer mockup's density and confidence, **and
none of the already-correct money/lifecycle/data behaviour regressed.**

Review in code-review mode: findings first, ordered by severity, with file and
line references. Prioritize financial correctness, data honesty, over-fetching,
lifecycle safety, and drift from the locked design.

## Required context

Read before reviewing:

1. `Work/Dashboard/refactorMainDashboard/Design/DESIGN-POLISH-HANDOFF.md`
2. `Work/Dashboard/refactorMainDashboard/Design/HANDOVER-IMPLEMENTOR.md`
3. `Work/Dashboard/refactorMainDashboard/designer-handoff.md`
4. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`
5. the design bundle:

```text
https://api.anthropic.com/v1/design/h/TEinDTmhHl39ddMH5p6Kxw?open_file=explorations%2Fdashboard%2Fdashboard.html
```

The mockup wins on look and behaviour. The local handoff docs win on endpoint
reality and money/data honesty.

## Scope gate

This is an **implementation** PR set, not a planning PR. Expect changes under:

- `Frontend/src/components/organisms/dashboard/returning/openMonth/*`
- `Frontend/src/components/molecules/budget/AllocationBar.tsx`
- the matching `*.i18n.ts` dictionaries
- `Frontend/e2e/*` (DP5 only)
- `docs/ai/ai-changelog.md`

Reject as wrong scope if a PR touches: backend, endpoints, DTOs, `dashboardTerms.ts`
math, `attentionRanking.ts`, `closeBandState.ts` resolution, close-month contracts,
auth, Docker, Caddy, CI, package/lockfiles, or the generated design bundle.

## Must-reject issues

Reject if any of these occur:

- Any transaction / spend-progress / "spent so far" / burn-rate / due-date /
  actual-bank language enters the UI.
- `remaining` can drift from backend `finalBalanceWithCarryMonthly`, or bars/legend
  re-derive remaining instead of consuming the existing `terms`.
- Carry-over folded into income.
- The six-term equation source values changed.
- An editor/detail endpoint is fetched on initial dashboard load to feed a bar
  (all pillar data already arrives on the dashboard read — no new fetch is allowed).
- Edit affordances appear on closed/skipped months, or Quick adjust becomes
  visible/usable in read-only states.
- Quick-adjust copy implies create / delete / lifecycle / transfer / archive /
  restore / balance-adjust.
- Attention ranking is altered, presented as backend advice, or loses its
  "how chosen" disclosure.
- A new palette, font, or design system is introduced, or user-facing strings are
  hardcoded instead of i18n.
- Deficit gains shame copy, or the runs-out marker / unfunded tail is weakened.

## Per-PR review

### DP1 — Pillar workbench density
- Income/expenses rows are proportional `MiniBar`s sourced from
  `breakdown.incomeItems` / `expenseCategoryItems` — not re-fetched, not faked.
- Savings shows per-goal rows (favorite dot, name, %, progress bar,
  `saved of target · monthly/mo`); a zero/no-target goal renders no `%` and no
  full bar (no divide-by-zero, no `NaN`/`Infinity` width).
- Debts shows per-row name, APR, balance bar, `balance · monthly/mo`, sourced from
  `liveDashboard.debt.debts[]`.
- Bar widths are clamped (0–100%); largest-value denominators never divide by zero.
- Empty/zero pillar states preserved (calm single line, no skeleton/zero-width bars).
- Footer still has exactly one Quick adjust (lazy drawer) + one Editor route; the
  handlers are unchanged.

### DP2 — AllocationBar legend + calm palette
- Legend lists only **visible** segments, each with the correct amount, driven by
  the same `terms` the bar uses.
- Palette: Expenses navy (`shell-3`), Savings blue (`shell-2`), Debts amber
  (`warning`/`alert`), Free green (`accent`). Expenses is **not** `eb-danger`.
- Legend strings come from the existing allocation dictionary — no parallel set,
  no hardcoded labels.
- Deficit marker + hatched unfunded tail unchanged (`eb-danger`); bar math/denominator
  unchanged; segment widths still sum ≤ 100% in every mode.

### DP3 — MoneyState hero + simplified "why"
- Remaining anchor is the dominant element; inline tone word per state from the
  dictionary (surplus / zero / deficit).
- One clear "why" (the legend'd flow bar); the bordered equation chip row is
  removed or visually demoted — not two competing representations.
- Remaining still equals the backend value; reconciliation warning path intact.
- Breakdown link to `/dashboard/breakdown` preserved.

### DP4 — Surface cohesion
- Pillar cards use the shared glass surface recipe (`eb-surface`/`shadow-eb`/radius-24);
  no flat `bg-white/75`. Prefer reuse of `SurfaceCard`/`CardShell`.
- No new shadow/blur tokens; one surface language across all dashboard cards.

### DP5 — Playwright visual + E2E (tests only)
- No component changes in this PR.
- Scenarios cover: open normal/surplus, deficit (marker + tail), eligible-close,
  overdue-close, zero remaining, no-savings/no-debts empty states, closed read-only,
  skipped read-only, and quick-adjust lazy-drawer (asserting no editor fetch on load
  where the harness allows).
- Desktop + mobile screenshots captured for at least open-normal and deficit.
- Tests use existing e2e seeding (`steenbudgetE2E`) and follow `playwright.config.ts`
  projects.

## Data + over-fetch review

Confirm the initial open-month render still uses only:

- `GET /api/budgets/months/status`
- `GET /api/budgets/dashboard?yearMonth={optional}`

Flag if a new bar/row triggers any of these on initial load: `/editor`,
`/income-items`, `/savings-goals`, `/savings-methods`, `/debt-items`,
`/debt-editor`, `/expense-categories`. These remain lazy (drawer/editor open only).

## Money correctness review

- Bars and legend consume `buildDashboardTerms(...).terms`; no independent money
  computation, no `float`-style imprecision.
- Positive, zero, and negative remaining all still reconcile.
- Savings = base + goal contributions; debt term = monthly payments (total balance
  is contextual only).
- Carry-over displayed separately.

## Accessibility + visual QA

- Bars have accessible labels/`role`s; progress bars expose value where relevant.
- Keyboard access + visible focus for Quick adjust, Editor, Breakdown, close CTA.
- Money values do not overlap; button labels fit on mobile (≥44px targets).
- Reduced-motion respected for any new transition.
- No nested-card clutter; no decorative background fighting the shell.
- Loading states do not cause large layout jumps.

Use browser/Playwright screenshots for at least: desktop open-normal, mobile
open-normal, desktop deficit, desktop eligible/overdue close. If visual
verification cannot be run, say so explicitly.

## Test expectations

- Updated component tests for each touched component (workbench, AllocationBar,
  MoneyState), still green and not gutted to pass broken code.
- `npm run build` from `Frontend/`.
- DP5 Playwright scenarios present and runnable (or a documented reason they
  could not run).

Report missing validation as residual risk.

## Review output format

```text
Findings
- [P1] path/to/file.tsx:123 - Problem. Why it matters. Fix.

Open Questions
- ...

Validation Reviewed
- ...

Summary
- ...
```

If there are no findings, say so directly and still list remaining test or visual
QA gaps.
