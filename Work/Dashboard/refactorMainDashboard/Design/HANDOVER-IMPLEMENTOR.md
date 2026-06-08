# Handover — Implementor (Dashboard Visual Polish)

You are implementing the **visual polish pass** for the already-shipped open-month
dashboard in SteenBudgetSolution. This is a reskin of the section bodies, not a
re-architecture. The data, money math, lifecycle, and lazy-load behaviour are
already correct and must stay untouched.

## Required design source

Fetch the design bundle, read the dashboard handoff, and mirror the Spine
direction and the PillarShell / MiniBar / GoalRow / flow-bar grammar:

```text
https://api.anthropic.com/v1/design/h/TEinDTmhHl39ddMH5p6Kxw?open_file=explorations%2Fdashboard%2Fdashboard.html
```

Read inside the bundle:

- `explorations/dashboard/dashboard-handoff.md` (§3.2, §3.4, §7)
- `explorations/dashboard/pillars.jsx` (`PillarShell`, `MiniBar`, `GoalRow`, debt rows)
- `explorations/dashboard/sections.jsx` (`AllocFlow`, `MoneyState`)
- `explorations/dashboard/shared.jsx` (`Surface`, `Money`, `Kicker`)

The mockup is a fidelity reference, not shippable code. Do not port inline mock
data, the tweaks panel, the device frame, or inline styles. Rebuild with the
existing React/TS components, `eb-*` tokens, Inter, and the existing i18n
dictionaries.

## Local context to read first

1. `Work/Dashboard/refactorMainDashboard/Design/DESIGN-POLISH-HANDOFF.md` (the spec — read it fully)
2. `Work/Dashboard/refactorMainDashboard/designer-handoff.md` (original data boundaries)
3. `Work/Dashboard/refactorMainDashboard/endpoint-inventory.md`

Inspect before editing:

- `Frontend/src/components/organisms/dashboard/returning/openMonth/MoneyState.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/OpenMonthPillarWorkbench.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/PillarWorkbenchCard.tsx`
- `Frontend/src/components/molecules/budget/AllocationBar.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/AttentionLane.tsx` (for surface-language reference only)
- `Frontend/src/components/organisms/dashboard/returning/openMonth/CloseBand.tsx` (surface reference)
- `Frontend/src/domain/budget/dashboardTerms.ts` (do not modify)
- `Frontend/src/types/budget/BudgetDashboardDto.ts` (field names)
- `Frontend/src/utils/i18n/pages/private/dashboard/openMonth/*.i18n.ts` (string dictionaries)
- existing surface primitives: `components/atoms/cards/SurfaceCard.tsx`, `CardShell.tsx`

## Hard constraints (rejection if violated)

1. Budgeting app, not banking. No transaction, spend-progress, "spent so far",
   burn-rate, or due-date language. Every figure is planned-budget data.
2. Do not change money math. `buildDashboardTerms`, the six-term equation source
   values, and `remaining = finalBalanceWithCarryMonthly` are frozen. Bars and
   legends consume the existing `terms`; they never re-derive remaining.
3. Carry-over stays its own term, never folded into income.
4. Render from the single `GET /api/budgets/dashboard` read plus the existing
   month-status read. Do not fetch any editor/detail endpoint on dashboard load.
   All pillar bar data already arrives on the dashboard read.
5. Quick-adjust drawers stay bulk-patch only. Do not add or imply create / delete
   / lifecycle / transfer / archive / restore / balance-adjust actions.
6. Closed/skipped months expose zero edit affordances (handled upstream; do not
   regress it).
7. Attention ranking stays on-device and labelled. Do not touch `attentionRanking.ts`.
8. Deficit stays clear but never shameful; surplus stays actionable, not noisy.
9. Use existing `eb-*` tokens, Inter, and i18n dictionaries. No new colour system,
   no new font, no hardcoded user-facing strings.

If a visual detail appears to need data not on the current read, **stop and
document an endpoint request** in this folder. Do not fake a number.

## Available data (confirmed present on the dashboard read)

- Income split: `breakdown.incomeItems` (`BreakdownItem[]`, `.key` carries `:salary` / `:member:` / `:side:`, plus `.label`, `.amount`).
- Expense categories: `breakdown.expenseCategoryItems` (`BreakdownItem[]`: `.key`, `.label`, `.amount`).
- Savings goals: `dashboardMonth.liveDashboard.savings.goals[]` — `DashboardSavingsGoalDto { id?, name?, targetAmount?, amountSaved?, monthlyContribution, isFavorite? }`.
- Debts: `dashboardMonth.liveDashboard.debt.debts[]` — `DashboardDebtItemDto { id, name, type, balance, apr, monthlyPayment }`, plus `totalDebtBalance`, `totalMonthlyPayments`, `repaymentStrategy`.
- Allocation terms: `buildDashboardTerms(dashboardMonth).terms` (already used by MoneyState/AllocationBar).

Tokens confirmed to exist (`index.css` + `tailwind.config.js`): `--eb-shell-2`/`shell2`,
`--eb-shell-3`/`shell3`, `--eb-warning`/`warning` and `--eb-alert`/`alert` (amber),
`--eb-accent`/`accent`, `--eb-accent-soft`/`accentSoft`, `--eb-danger`/`danger`.

## Implementation plan — ordered, independently verifiable slices

Keep each PR small. Commit after each completed slice (Conventional Commits),
write the message to `COMMIT_MSG.tmp`, append to `docs/ai/ai-changelog.md`, and
**stop** — do not commit or push.

### DP1 — Pillar workbench density

Scope:

- In `OpenMonthPillarWorkbench` / `PillarWorkbenchCard`, replace flat `SignalRow`
  bodies with proportional bar rows. Extract a small reusable `MiniBar`
  (label · amount · proportional fill) and, where helpful, a `GoalRow` and a
  `DebtRow`, co-located with the workbench (mirror the mockup's `pillars.jsx`).
- **Income:** salary / household / side `MiniBar` rows, fill proportional to the
  largest of the three. Group from `breakdown.incomeItems` using the existing
  `aggregateIncomeGroups` logic.
- **Expenses:** top-3 `expenseCategoryItems` as `MiniBar` rows (fill vs. largest
  category). Keep the subscription + recurring pressure chips below a divider.
- **Savings:** top-3 goal rows — favorite dot (`isFavorite`), name, `%` of target,
  per-goal progress bar, `saved of target · monthly/mo` sub-line. Keep a header
  sub-line `{base} base + {goals} goals`. A goal with no/zero target renders
  amounts without a `%` (no divide-by-zero, no full bar).
- **Debts:** debt rows — name, `apr%`, balance bar (fill vs. largest balance),
  `balance · monthly/mo` sub-line. Keep total monthly + total balance + strategy
  chip as header/sub context.
- Preserve every existing empty/zero state (calm single line — no skeleton bars,
  no zero-width segments).
- Preserve the footer: one Quick adjust (lazy drawer) + one Editor route per pillar.

Out of scope: new fields, editor reads, footer action changes, money math.

Tests: extend `OpenMonthPillarWorkbench.test.tsx` — assert bars/rows render for
populated pillars, empty states for zero pillars, no NaN/Infinity width on
zero-target goals or zero-balance debts, and that footer actions still fire the
right handlers.

### DP2 — AllocationBar legend + calm palette

Scope:

- Add a legend above the bar in `AllocationBar` (or in `MoneyState` directly
  above it, whichever keeps `AllocationBar` reusable): dot + label + amount per
  **visible** segment, driven by the same `terms`. Reuse the existing allocation
  label strings from `MoneyState.i18n`; pass them in via the existing
  `AllocationBarLabels` contract — do not invent a parallel string set.
- Recolour segments: Expenses → `shell-3` (navy), Savings → `shell-2` (blue),
  Debts → `warning`/`alert` (amber), Free → `accent` (green). Expenses must no
  longer use `eb-danger`.
- Keep the deficit runs-out marker and hatched unfunded tail on `eb-danger`,
  unchanged. Do not touch the bar's denominator/width math.

Tests: extend `MoneyState.test.tsx` (or add `AllocationBar.test.tsx`) — legend
lists the right segments with amounts; deficit still renders marker + tail; no
red expenses segment in surplus/zero.

### DP3 — MoneyState hero + simplified "why"

Scope:

- Scale the remaining anchor up to the dominant element and add the inline tone
  word (surplus / zero / deficit) using the existing dictionary. Use the nearest
  existing type step; do not introduce arbitrary font sizes outside the scale
  where a token step exists.
- Make the legend'd flow bar the primary inline "why". Demote or remove the
  bordered equation chip row so there is one clear explanation. If retained,
  render the six terms as quiet inline text, not bordered cells.
- Keep the `/dashboard/breakdown` link as a secondary affordance.

Out of scope: equation values + reconciliation are untouchable; only visual
weight changes.

Tests: update `MoneyState.test.tsx` — tone word per state, single primary "why"
present, remaining still equals backend value, reconciliation warning path intact.

### DP4 — Surface cohesion

Scope:

- Move pillar cards onto the shared glass surface recipe (`eb-surface` /
  `shadow-eb` / radius-24) used by MoneyState / CloseBand / AttentionLane.
  Prefer reusing `SurfaceCard` / `CardShell` if it already encodes the recipe.
- One surface language across all dashboard cards. No new shadow/blur tokens.

Tests: visual; covered by DP5. Keep existing component tests green.

### DP5 — Playwright visual + E2E regression (final PR, tests only)

Scope:

- Add focused Playwright coverage for the polished dashboard. Reuse the existing
  e2e seeding (`Backend.Tools seed-e2e` / `steenbudgetE2E`) and the existing
  dashboard route. Follow `Frontend/playwright.config.ts` project conventions;
  prefer the `smoke` project for the load path and `full` for the state matrix.
- Scenarios (desktop ~1180px and mobile):
  - open normal / surplus — pillars show bars, legend visible, hero dominant
  - deficit — red anchor + "short", runs-out marker + unfunded tail present
  - eligible-to-close and overdue-close — CloseBand treatments
  - zero remaining — "every krona is assigned"
  - no savings / no debts pillar empty states
  - closed read-only and skipped read-only — no edit affordances, no Quick adjust
  - quick-adjust opens a lazy drawer (no editor fetch on load — assert via network
    if the harness supports it)
- Capture screenshots for desktop + mobile open-normal and deficit at minimum.

Out of scope: no component changes in this PR; tests only. If a scenario cannot
be seeded/mocked, document it as a residual gap rather than faking it.

## Reuse before rebuilding

- `MiniBar` / `GoalRow` / debt-row patterns from the mockup's `pillars.jsx`.
- Existing `aggregateIncomeGroups`, `normalizeStrategy` in the workbench.
- Existing `AllocationBarLabels` contract and `MoneyState.i18n` allocation strings.
- Existing surface primitives (`SurfaceCard`, `CardShell`) and `shadow-eb`.
- Existing money formatting (`formatMoneyV2`, `moneyDecimalsFor`).
- Existing tone classifier in `MoneyState`.

## Validation

At minimum per slice:

- Updated/added component tests for the touched component.
- `npm run build` from `Frontend/`.
- Focused frontend test run for dashboard/openMonth.
- DP5: Playwright run (or documented reason if the environment can't run it).

Report exactly what was run and what remains unverified. Do not imply success
when validation was partial.

## Stop conditions

Stop and ask if:

- A visual detail requires data not on the current dashboard read.
- You cannot keep the money terms reconciling.
- A change would require fetching an editor endpoint on initial load.
- You need to change backend DTOs, endpoints, or close-month lifecycle.

## Definition of done

- The eight gaps in the design handoff are closed in their assigned PRs.
- No money-math, reconciliation, lazy-load, attention, close-flow, or read-only
  behaviour changed.
- i18n complete (EN/SV/ET) for all new strings.
- Tests/build relevant to each slice were run.
- `docs/ai/ai-changelog.md` appended; `COMMIT_MSG.tmp` written.
- No commit, push, branch creation, reset, rebase, or checkout.
