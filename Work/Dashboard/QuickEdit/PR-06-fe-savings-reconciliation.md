# PR 6 - FE Quick Edit Savings Reconciliation (PR E)

| | |
| --- | --- |
| **Type** | Frontend implementation |
| **Depends on** | `PR-02-fe-quick-edit-shell-foundation.md` (PR A merged), shared money equation footer (PR B merged), expenses parity (PR C merged), income domain depth (PR-05 / PR D merged) |
| **Blocks** | Debt honesty upgrade (PR F), hardening tests (PR G) |
| **Risk** | Medium: the Savings tab gains a new editable surface (base savings) and a wider footer projection. Two save boundaries (base savings, goal contributions bulk) coexist in one tab. Mutations stay on existing per-resource endpoints with `scope: "currentMonthOnly"`. No backend change. |

## 1. Purpose

Bring the Savings tab of the Quick Edit drawer to parity with the designer's
intent for the Savings panel, as described in PR-01 §8 and §10 PR E.

Today the Savings tab only edits monthly contributions on existing savings
goals. The dashboard `savings` term, however, is

```text
savings = baseSavings (habit) + goalContributionsTotal
```

so the current drawer's "Save changes" affects only one half of that sum and
the footer projection silently ignores the base savings half. The tab does not
let the user see or adjust the base savings amount even though it is the
single largest lever on the savings term for most households.

This PR closes that gap by:

- surfacing base savings as a first-class, dedicated editable row at the top
  of the Savings tab,
- widening the footer projection so the "free this month → projected" preview
  matches the real six-term equation,
- removing the prototype's "Top up" affordance entirely (PR-01 §10: "no fake
  one-time transfer UI exists"),
- keeping every save honest: each backend transaction stays single-resource.

The point is to make the Savings tab feel as honest and useful as the Income
tab does after PR D, without inventing a cross-domain save, without writing
the budget plan, and without inventing savings semantics the backend does
not support.

## 2. Source files to read first

Planning:

- `Work/Dashboard/QuickEdit/PR-00-current-state.md`
- `Work/Dashboard/QuickEdit/PR-01-designer-handoff-ba-technical-analysis.md`
- `Work/Dashboard/QuickEdit/PR-02-fe-quick-edit-shell-foundation.md`
- `Work/Dashboard/QuickEdit/PR-05-fe-income-domain-depth.md`

Existing savings surfaces to align with (do NOT copy verbatim; the full
editor is a page-level surface, this is a drawer-level surface — but the
domain rules, base savings semantics, and `isMonthOnly` handling must match):

- `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsPlanBalanceStrip.tsx`
- `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
  (if present — for the canonical scope/save semantics; do not import a
  page-level dialog into the drawer)
- `Frontend/src/Pages/private/savings/components/SavingsGoalsLedgerSection.tsx`
  (only for naming/grouping consistency — read, don't import)

Existing drawer patterns to mirror from PR C / PR D:

- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodFooter.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodSection.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/QuickEditTabs.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/income/IncomePanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/savings/SavingsPanel.tsx`
- `Frontend/src/domain/budget/quickEditProjection.ts`
- `Frontend/src/domain/budget/quickEditProjection.test.ts`
- `Frontend/src/domain/budget/dashboardTerms.ts`

Backend contract / DTOs / hooks:

- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
  (`patchBudgetMonthBaseSavings`, savings-goals bulk patch)
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
  (`useBudgetMonthSavingsGoals`, `usePatchBudgetMonthSavingsGoalsBulk`,
  `usePatchBudgetMonthBaseSavings`,
  `invalidateBudgetMonthEditingQueries`)
- `Frontend/src/types/budget/BudgetMonthsStatusDto.ts`
  (`PatchBudgetMonthBaseSavingsRequestDto`,
  `BudgetMonthBaseSavingsEditorDto`,
  `BudgetMonthSavingsGoalEditorRowDto`)
- `Frontend/src/types/budget/BudgetDashboardMonthDto.ts` (wrapper) and
  `Frontend/src/types/budget/BudgetDashboardDto.ts` (`SavingsOverviewDto`:
  `liveDashboard.savings.monthlySavings`,
  `liveDashboard.savings.isMonthOnly`,
  `liveDashboard.savings.totalSavingsMonthly`)
- `Frontend/src/hooks/dashboard/dashboardSummary.types.ts`
  (`DashboardSummary.habitSavings`)
- `Frontend/src/hooks/dashboard/buildDashboardSummaryAggregate.ts`
  (how `habitSavings` is derived from `dashboard.savings?.monthlySavings`)
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Savings.cs`
  (read-only; confirm the base savings PATCH semantics)

Dashboard wiring (read-only — the drawer must receive base savings via props,
not by fetching directly):

- `Frontend/src/components/organisms/pages/DashboardContent.tsx`

i18n:

- `Frontend/src/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/savings/*.i18n.ts` (naming
  consistency only — do not import a page-level dictionary into the drawer)

## 3. BA decisions locked in for this PR

The PR-01 BA questions for savings are resolved as follows. These are the
default the implementor must follow; if any feel wrong, stop and ask before
coding.

- **Base savings IS surfaced in the drawer as a dedicated editable row at the
  top of the Savings tab.** Required so the footer's "savings" total
  reconciles with the dashboard six-term equation. Hiding it would leave the
  largest lever on the savings term unreachable from the quick surface.
- **Base savings saves through its own dedicated inline action, separate from
  the goal-contributions footer Save.** Each backend transaction stays
  single-resource. No sequential save dressed up as one Save. PR-01 §4
  explicitly forbids "sequential frontend saves while presenting them as one
  safe save".
- **Source of truth for base savings amount and `isMonthOnly`: the existing
  dashboard month query that already feeds `dashboardTerms`.** The drawer
  must NOT fetch a separate base-savings GET — DashboardContent passes a new
  `dashboardSavings` prop into the drawer, the drawer threads it into
  `SavingsPanel`. This avoids a duplicate request and keeps the panel's data
  consistent with the dashboard view behind it.
- **Patch base savings with `scope: "currentMonthOnly"`** (matches PR D / PR C
  precedent — no plan writes from a quick surface).
- **One-time transfer ("Top up") is removed.** The backend POST
  `/savings-goals/{id}/transfer` is non-idempotent and needs a confirmation +
  debounce flow; that is too risky for a quick surface. The drawer must NOT
  render any "Top up" affordance. The full savings editor remains the place
  for one-time transfers, deep-linked from the existing "Open planning"
  footer action.
- **Goal create / rename / target-amount change / cancel / complete / remove
  stay out of the drawer.** Matches PR D precedent (no destructive or
  plan-shaped actions in the quick surface). Backend endpoints remain
  available; they just are not surfaced here.
- **"Pause contribution" is not a new lifecycle action.** Setting
  `monthlyContribution = 0` in the existing bulk PATCH is the honest way.
  No new `paused` state is introduced.
- **Closed / skipped / non-editable months: base savings row and goal rows
  are both read-only.** No save buttons, no inline edits. Defensive even
  though the dashboard normally branches away.

## 4. Non-negotiable behavior

- Save is per-resource. There is no cross-domain save, and inside the
  Savings tab there is no cross-resource save either. Two separate
  mutations exist:
  - `usePatchBudgetMonthBaseSavings` for base savings (one transaction).
  - `usePatchBudgetMonthSavingsGoalsBulk` for goal contributions (one
    transaction, bulk).
- Both mutations send `scope: "currentMonthOnly"`. Neither writes the plan.
  Neither sets `updateDefault: true`.
- Base savings amount + `isMonthOnly` are read from the dashboard month
  query that already feeds `dashboardTerms`
  (`liveDashboard.savings.monthlySavings`,
  `liveDashboard.savings.isMonthOnly`). The Savings tab does not fetch a
  parallel base-savings GET.
- Carry-over is not savings; do not blend it into savings copy or savings
  totals.
- Footer projection contract widens for the savings domain:
  - `baseDomainTotal` = `baseSavingsServer + Σ row.monthlyContribution`
    over non-deleted, non-closed goal rows.
  - `draftDomainTotal` = `effectiveBase + Σ draft.monthlyContribution`
    over the same row set, where `effectiveBase` is the user's pending
    draft of base savings if the inline base editor is dirty, else the
    server value.
  - Sign stays `-1` (savings reduces free money). This is already handled
    by `quickEditProjection.ts` with `domain: "savings"`. Do not change
    the sign table.
- Closed / skipped / non-editable months must remain read-only. No base
  savings input, no goal amount inputs, no save buttons.
- The "Top up" prototype affordance must NOT be rendered. No
  one-time-transfer UI in this PR.
- Do not copy prototype JavaScript. Rebuild with repo React/TypeScript,
  Tailwind, existing eBudget tokens, and existing i18n patterns.
- Preserve the existing relevant `data-testid` value
  (`period-savings-row-{id}`) on goal rows unless replaced by an
  equivalent that the new tests document.

## 5. Included scope

### 5.1 Base savings row

- A new dedicated row at the very top of the Savings tab, visually
  separated from goal rows (own `EditPeriodSection`, calmer surface
  treatment — no loud accent).
- Surfaces:
  - the current `baseSavingsMonthly` formatted with
    `formatMoneyV2(..., currency, locale, { fractionDigits: 2 })`,
  - an `isMonthOnly` muted hint when the current month already carries a
    month-only override (existing semantic on
    `BudgetMonthBaseSavingsEditorDto.isMonthOnly` mirrored on
    `liveDashboard.savings.isMonthOnly`),
  - an amount input, money-input parser identical to the goal rows
    (`sanitizeMoneyInput` / `parseMoneyInput`, `allowNegative: false`,
    `maxDecimals: 2`),
  - a dedicated inline action button on the row: "Apply base savings"
    (i18n key required, sv/en/et). The button is disabled when the draft
    matches the current value or fails validation.
- The base savings input is dirty when the parsed draft differs from the
  server value. Validation copy reuses `amountRequired` / `amountInvalid`
  / `fixValidationErrors`.
- On successful apply:
  - toast `saveSuccess`,
  - rely on the hook's existing
    `invalidateBudgetMonthEditingQueries` to refresh the dashboard month
    query (which is what carries `liveDashboard.savings.monthlySavings`
    and `summary.habitSavings`),
  - do NOT close the drawer (the user may still have unsaved goal
    contributions).
- On failure: toast `saveErrorGeneric`, keep the draft, leave the button
  enabled so the user can retry.
- Read-only months render the current value only — no input, no apply
  button.

### 5.2 Goal rows

- Existing bulk-editable goal rows remain the second section of the
  Savings tab, under a clearly separate section heading.
- No new affordances on goal rows in this PR — no "Top up", no rename,
  no target change, no cancel, no complete, no remove. The amount input
  is the only editable surface.
- Closed-status rows (`row.status === "closed"`) and deleted rows
  (`row.isDeleted`) remain hidden, matching the current panel behavior.
- Active rows render in their current order. No re-grouping.
- Footer Save continues to save goal contributions only, via
  `usePatchBudgetMonthSavingsGoalsBulk`. Payload still uses
  `scope: "currentMonthOnly"`. The footer Save does NOT save base
  savings even when the base row is dirty — base savings has its own
  inline action.

### 5.3 Footer projection

- Update the two reducers passed into `EditPeriodFooter`'s
  `projection.baseDomainTotal` / `draftDomainTotal` so they include base
  savings:
  - `baseDomainTotal = baseSavingsServer + Σ row.monthlyContribution`
  - `draftDomainTotal = effectiveBase + Σ draftMonthlyContribution`
  where `effectiveBase` is the parsed base savings draft when the inline
  editor is dirty AND valid, else `baseSavingsServer`.
- The footer's "savings reduces free money" sign is already handled in
  the shared projection (`savings: -1`). Do not duplicate that here.
- The footer summary text changes when either base savings OR any goal
  contribution is dirty. Reuse existing keys:
  `footerSummaryEditable` / `footerSummaryNoChanges` /
  `footerSummaryReadOnly` / `fixValidationErrors`.
- The footer Save button enables when **goal contributions** are dirty
  and valid. It does NOT enable on a dirty base-savings-only draft —
  base savings has its own inline Apply. The footer summary should still
  reflect projection movement caused by the (unsaved) base draft so the
  user sees how their pending base change will move "free this month".
  Visualising the projection without enabling the bulk Save is honest:
  the user is shown the math of what they typed but cannot accidentally
  flush it through the wrong endpoint.

### 5.4 Wiring from the dashboard down

- Extend `EditPeriodDrawer`'s public props with:
  ```ts
  dashboardSavings?: {
    baseSavingsMonthly: number;
    isMonthOnly: boolean;
  };
  ```
  Optional so existing callers that don't yet have access to the
  dashboard month data continue to compile. When omitted, the
  SavingsPanel renders the existing goals-only experience with the
  legacy projection (base savings unaffected, cancels out). When
  provided, the panel renders the new base savings row and the widened
  projection.
- `DashboardContent` populates the new prop from variables already in
  scope. The concrete shape, using the existing local names
  (`summary: DashboardSummary`, `dashboardMonth: BudgetDashboardMonthDto`,
  `dashboardTermsResult`), is:
  ```ts
  dashboardSavings={{
    baseSavingsMonthly:
      dashboardMonth.liveDashboard?.savings?.monthlySavings
      ?? summary.habitSavings,
    isMonthOnly:
      dashboardMonth.liveDashboard?.savings?.isMonthOnly
      ?? false,
  }}
  ```
  The fallback to `summary.habitSavings` is honest because
  `buildDashboardSummaryAggregate` derives that field from
  `dashboard.savings?.monthlySavings` already, so closed-month or
  null-`liveDashboard` paths still get the right value. Reuse the same
  query that already produces `dashboardTermsResult`. No additional
  fetch.
- The drawer forwards the new prop into `SavingsPanel` only. Other
  panels are unaffected.
- If `dashboardSavings` is provided but the month is closed / skipped /
  non-editable, the base savings row renders read-only.

### 5.5 i18n

- New keys, all three locales (sv / en / et). Suggested keys:
  - `savingsBaseTitle` — section title for the base savings row.
  - `savingsBaseDescription` — one calm sentence explaining what base
    savings is in this product. No marketing tone.
  - `savingsBaseAmountLabel` — accessible label for the amount input.
  - `savingsBaseMonthOnlyHint` — muted hint when
    `dashboardSavings.isMonthOnly === true` (e.g. sv: "Den här månaden
    har ett eget basbelopp.").
  - `savingsBaseApply` — button copy: "Spara basbelopp" / "Apply base
    savings" / "Salvesta põhisumma".
  - `savingsBaseAppliedToast` — optional dedicated success toast key,
    or reuse `saveSuccess` if the implementor prefers fewer keys
    (document the choice in the change entry).
  - `savingsGoalsSectionTitle` — section title above the goal rows, so
    the two sections are clearly distinct.
- Reuse existing keys where copy genuinely matches (`amountRequired`,
  `amountInvalid`, `fixValidationErrors`, `saveSuccess`,
  `saveErrorGeneric`, `loadingEditor`, `footerSummaryEditable`,
  `footerSummaryNoChanges`, `footerSummaryReadOnly`,
  `savingsMonthOnlyHelper`, `noSavingsGoals`).
- No hard-coded UI strings in TSX.

### 5.6 Closed / skipped month handling

- Resolve a `readOnly` boolean the same way the other panels do (mirror
  PR D's pattern with `canEditMonth(month.isEditable, month.status)`).
- On read-only months:
  - The base savings row renders the current value with no input and no
    Apply button.
  - Goal rows render their current value with no input.
  - The footer Save button stays disabled; existing copy
    (`footerSummaryReadOnly`) covers the message.

## 6. Excluded scope

Do not do any of the following in this PR:

- introduce a cross-domain Save across tabs,
- introduce a cross-resource Save inside the Savings tab (no single
  button that saves base savings + goal contributions together — that
  would require either a backend aggregate endpoint or a sequential
  frontend save, both explicitly rejected by PR-01 §4),
- implement a backend savings aggregate endpoint,
- render a "Top up" affordance, a one-time-transfer dialog, or any
  call into `transferBudgetMonthSavingsGoal`,
- render goal create, rename, target-amount change, cancel, complete,
  or remove affordances in the drawer,
- write the budget plan from quick edit (no `updateDefault: true`, no
  `currentMonthAndBudgetPlan`, no `budgetPlanOnly` for either base
  savings or goal contributions),
- change the active dashboard projection contract or
  `quickEditProjection.ts` math (extending the savings reducer values
  inside the panel is fine; the projection function signature must
  not change),
- modify the Income, Expenses, or Debts tabs,
- introduce a new icon system, palette, font, or marketing-style
  treatment,
- modify packages, lockfiles, build config, Docker, or CI.

If an excluded item seems required to finish the savings reconciliation
slice, stop and ask. Do not smuggle product decisions into this PR.

## 7. Acceptance criteria

- The Savings tab renders two clearly separated sections:
  1. Base savings (single dedicated row at the top).
  2. Goal contributions (existing bulk-editable rows below).
- The base savings row shows the current `baseSavingsMonthly` formatted
  in the user's currency and locale.
- When `liveDashboard.savings.isMonthOnly === true`, the base savings
  row displays the month-only hint copy.
- The base savings row has its own amount input and its own inline
  Apply button, disabled when the draft matches the server value or
  fails validation.
- Clicking Apply calls `usePatchBudgetMonthBaseSavings` with
  `{ amountMonthly: <parsed>, scope: "currentMonthOnly" }` and toasts
  `saveSuccess` on success. The drawer does not close.
- The footer Save button enables only when goal contributions are dirty
  and valid. A dirty-but-unapplied base savings draft does NOT enable
  the footer Save.
- The footer projection preview reflects:
  - changes to goal contributions (existing behavior, widened to
    include base savings as a constant when base is clean),
  - changes to base savings as a `draftBase - serverBase` delta on
    `draftDomainTotal` when the base draft is valid.
- The Save action in the footer calls
  `usePatchBudgetMonthSavingsGoalsBulk` with the same payload shape it
  uses today; base savings is NOT included in that payload.
- Closed / skipped / non-editable months render the base savings row
  and goal rows as read-only, with no inline Apply button and the
  footer Save disabled.
- No "Top up" affordance is rendered anywhere on the Savings tab.
- All new visible text flows through the existing drawer i18n
  dictionary in sv, en, and et.
- The existing `period-savings-row-{id}` `data-testid` is preserved on
  goal rows. New `data-testid` values are added for the base savings
  row and its Apply button (e.g. `period-savings-base-row`,
  `period-savings-base-apply`).
- No backend, hook contract, or query-key change in this PR.

## 8. Suggested implementation steps

1. Extend `EditPeriodDrawer` props with optional `dashboardSavings`
   (see §5.4). Thread it into `SavingsPanel` only.
2. Populate the prop from `DashboardContent` using the dashboard month
   query that already feeds `dashboardTerms`. No new fetch.
3. Extract a small `BaseSavingsQuickRow` component next to
   `SavingsPanel.tsx`. Props:
   - `baseSavingsMonthly: number`
   - `isMonthOnly: boolean`
   - `readOnly: boolean`
   - `currency`, `locale`
   - `onApplied(amountMonthly: number): Promise<void>` (wraps the
     mutation call) OR pass `yearMonth` and let the row own the
     mutation. Pick the option that matches the existing PR C / PR D
     componentisation (don't invent a new pattern).
4. Refactor `SavingsPanel.tsx`:
   - render the new base savings section above the existing goals
     section,
   - keep the goal-rows section visually distinct (own
     `EditPeriodSection` title from the new key
     `savingsGoalsSectionTitle`),
   - update `baseDomainTotal` and `draftDomainTotal` to include base
     savings per §5.3,
   - resolve `readOnly` consistently with PR C / PR D,
   - remove any lingering references to the old "PR E will widen this"
     comment in the file,
   - do not introduce a "Top up" button.
5. Update `editPeriodDrawer.i18n.ts` for sv / en / et with the new
   keys in §5.5.
6. Update or add tests (see §9). Keep the EditPeriodDrawer top-level
   smoke tests green; add focused SavingsPanel tests for the new
   behavior.
7. Run focused frontend validation.

## 9. Test expectations

Add or extend tests so the new behavior has component-level coverage.

Minimum coverage:

- Base savings row renders when `dashboardSavings` is provided and is
  absent (or renders the legacy goals-only layout) when it is not.
- `isMonthOnly === true` renders the month-only hint copy; `false`
  does not.
- Editing the base savings amount enables the inline Apply button;
  empty / invalid input disables it with the correct validation copy.
- Clicking Apply calls `usePatchBudgetMonthBaseSavings` with
  `{ amountMonthly, scope: "currentMonthOnly" }` and surfaces the
  success toast. The drawer does not close.
- A dirty base savings draft does NOT enable the footer Save button.
- A dirty goal contribution DOES enable the footer Save button, and
  Save calls `usePatchBudgetMonthSavingsGoalsBulk` with the existing
  payload shape (no base savings in the bulk payload).
- The footer projection's `draftDomainTotal` reflects both a dirty
  base savings draft (delta `draftBase - serverBase`) and dirty goal
  contributions at the same time. A unit/component-level assertion on
  the projected preview value is sufficient; the projection math
  itself is already covered by `quickEditProjection.test.ts`.
- Read-only months render no base savings input, no Apply button,
  and no goal amount inputs. Footer Save is disabled.
- No "Top up" affordance is rendered in any state.

Focused validation command from `Frontend/`:

```bash
npm run test -- SavingsPanel
```

If the repository test runner does not support that exact filter, use
the narrowest available command and document exactly what was run.
Do not run the full expensive suite by default unless local failures
require broader proof.

## 10. Follow-up PRs

Expected next slices after this PR:

1. **PR F — Debt honesty upgrade**: switch the quick debt read to
   `debt-editor`, surface read-only balance / minimum context, surface
   the below-minimum or `coversInterestAndFees` warning, optionally
   surface skip/include via the rich row actions. Balance updates stay
   in the full editor.
2. **PR G — Hardening and tests**: drawer-level dirty-state tests
   across tabs, Playwright smoke for one happy-path quick edit,
   snapshot of the savings + income + expense projection math.

## 11. Validation

Implementation PR. Run the focused frontend tests listed above and
report any commands that could not be run.

Append a short entry to `docs/ai/ai-changelog.md` with date, what
changed, files touched, validation, and risks/follow-up. Write a
Conventional Commits message to `COMMIT_MSG.tmp`. Do not commit, push,
or open a PR.
