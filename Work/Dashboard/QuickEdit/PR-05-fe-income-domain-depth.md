# PR 5 - FE Quick Edit Income Domain Depth (PR D)

| | |
| --- | --- |
| **Type** | Frontend implementation |
| **Depends on** | `PR-02-fe-quick-edit-shell-foundation.md` (PR A merged), shared money equation footer (PR B merged), expenses parity (PR C merged) |
| **Blocks** | Savings reconciliation (PR E), Debt honesty upgrade (PR F), hardening tests (PR G) |
| **Risk** | Medium: surface change in the Income quick-edit panel. Mutations stay on existing per-domain endpoints with `scope: "currentMonthOnly"` and `updateDefault: false`. No backend change. |

## 1. Purpose

Bring the Income tab of the Quick Edit drawer to parity with the designer's
intent for the Income panel. Today the panel is a flat amount-only list with no
group structure, no salary lock, no active toggle, and no inline add. This PR
implements the income-depth slice promised by PR-01 §10 PR D.

The point is to make the Income tab feel as honest and useful as the Expenses
tab does after PR C, without inventing cross-domain saves, without writing the
budget plan, and without removing data.

## 2. Source files to read first

Planning:

- `Work/Dashboard/QuickEdit/PR-00-current-state.md`
- `Work/Dashboard/QuickEdit/PR-01-designer-handoff-ba-technical-analysis.md`
- `Work/Dashboard/QuickEdit/PR-02-fe-quick-edit-shell-foundation.md`

Existing income surfaces to align with (do NOT copy verbatim; the full editor
is a page-level surface, this is a drawer-level surface — but the domain rules,
grouping, and salary semantics must match):

- `Frontend/src/components/organisms/dashboard/editPeriod/income/IncomePanel.tsx`
- `Frontend/src/Pages/private/income/utils/buildIncomeLedgerGroups.ts`
- `Frontend/src/Pages/private/income/utils/buildIncomeLedgerGroups.test.ts`
- `Frontend/src/Pages/private/income/types/incomeEditor.types.ts`
- `Frontend/src/Pages/private/income/components/IncomeLedgerSection.tsx`
- `Frontend/src/Pages/private/income/components/IncomeLedgerRow.tsx`
- `Frontend/src/schemas/dashboard/monthEditor/incomeItem.schemas.ts`

Existing patterns to mirror from PR C (expenses parity):

- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/InlineCreateExpenseRow.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/CreateExpenseItemCard.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.scope.test.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/PeriodQuickAdjustRow.tsx`

Shell, footer, and projection contracts:

- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodFooter.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodSection.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/QuickEditTabs.tsx`
- `Frontend/src/domain/budget/quickEditProjection.ts`
- `Frontend/src/domain/budget/quickEditProjection.test.ts`

Backend contract:

- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/types/budget/BudgetMonthsStatusDto.ts` (income types)
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Income.cs`

i18n:

- `Frontend/src/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/income/IncomeLedgerSection.i18n.ts` (for naming
  consistency only — do not import a page-level dictionary into the drawer)

## 3. BA decisions locked in for this PR

The PR-01 BA questions for income are resolved as follows. These are the
default the implementor must follow; if any feel wrong, stop and ask before
coding.

- **Inactive income rows remain visible.** They render in the Income tab but
  do not contribute to the projection (the dashboard SQL counts
  `IsActive = 1` only). Hiding them would silently lose the user's ability to
  re-activate them without leaving the drawer.
- **Quick add is month-only only.** Inline create writes `scope:
  "currentMonthOnly"` and never touches the plan. Plan-aware add stays in the
  full income editor page.
- **Active/inactive toggle is exposed in quick edit for non-salary rows.** It
  is the smallest honest way to express "skip this side income this month"
  without inventing a new lifecycle field. Salary cannot be toggled (backend
  invariant: salary is always active).
- **Row delete is NOT exposed in this PR.** Matches PR C precedent (expenses
  did not add delete to the quick drawer). Deep-link to the full editor for
  destructive actions. Backend deletion remains available; it just isn't
  surfaced here.
- **Row rename is NOT exposed in this PR.** Matches PR C precedent.
- **Salary row is locked.** No name edit (backend already rejects), no toggle,
  no delete, no group-level add affordance. The amount is editable.

## 4. Non-negotiable behavior

- Save is active-tab only. There is no cross-domain save in this PR.
- The income bulk patch endpoint stays the same:
  `PATCH /api/budgets/months/{yearMonth}/income-items` via
  `usePatchBudgetMonthIncomeItemsBulk`.
- The income create endpoint stays the same:
  `POST /api/budgets/months/{yearMonth}/income-items` via
  `useCreateBudgetMonthIncomeItem`.
- All patches send `scope: "currentMonthOnly"` and `updateDefault: false`.
- All creates use `kind: "sideHustle"` or `kind: "householdMember"`; the type
  system already excludes `"salary"` from `CreateBudgetMonthIncomeItemRequestDto`.
- Carry-over is not income; do not blend it into income copy or income totals.
- Closed/skipped months must remain read-only. Defensive even though the
  dashboard normally branches away. No add, no toggle, no save.
- Footer projection must match `quickEditProjection.ts` semantics with
  `domain: "income"`:
  - `baseDomainTotal` = sum of currently-active, non-deleted rows on the server
  - `draftDomainTotal` = sum of rows that *would be active after save* using
    the user's draft `amountMonthly` and `isActive`
  - Inactive rows (server or draft) contribute 0 to both totals. This keeps
    the projection reconciled with the backend dashboard SQL after save.
- Do not copy prototype JavaScript. Rebuild with repo React/TypeScript,
  Tailwind, existing eBudget tokens, and existing i18n patterns.
- Preserve the existing relevant `data-testid` values
  (`period-income-row-{id}`) unless replaced by an equivalent that the new
  tests document.

## 5. Included scope

### 5.1 Grouping

- Group rendered rows by `kind`, in this fixed order:
  1. `salary` — group title: "Lön" / "Salary" / "Palk"
  2. `householdMember` — group title: "Hushållsinkomst" / "Household income" /
     "Leibkonna sissetulek"
  3. `sideHustle` — group title: "Sidoinkomst" / "Side income" / "Lisatulu"
- A small `buildIncomeQuickGroups` utility may live inside the drawer module,
  or the panel may reuse `buildIncomeLedgerGroups` directly. Either way:
  - Salary group always renders (even when there are zero salary rows; show
    the empty-state copy from the existing dictionary or a new key).
  - Empty `householdMember` / `sideHustle` groups render when the month is
    editable (so the user has somewhere to click "Add"); on read-only months
    empty non-salary groups are hidden. This matches the ExpensesPanel rule.
- Within each group:
  - Active rows first, inactive rows after, preserving the server's
    `SortOrder` within each rank.
  - Deleted rows are not rendered.

### 5.2 Salary lock

- Salary row exposes an amount input only.
- No active toggle, no add affordance for the salary group, no delete or
  rename UI.
- The salary group's section title may carry a small "(locked)" affordance
  label (i18n key required for sv/en/et) so the user understands why the
  affordances differ. Keep the visual treatment calm — do not add a lock icon
  illustration; a subtle muted text label is enough.
- Save continues to send `name: null` for salary rows (existing code path),
  `isActive: true`, and the draft amount.

### 5.3 Active / inactive toggle (non-salary rows)

- A toggle on each non-salary row sets `draft.isActive`.
- Inactive rows still render (slightly muted), with the input still editable
  so the user can adjust the amount before re-activating without losing
  context. The projection ignores them.
- Toggling alone counts as a change (`hasChanges = true`) and surfaces in
  `changedRows`.
- On save, the existing income bulk PATCH carries
  `isActive: draft.isActive`.

### 5.4 Inline add (household / side groups only)

- Mirror `InlineCreateExpenseRow` from PR C. Only one inline create form open
  at a time, controlled by `inlineCreateOpenFor: string | null` keyed by group
  key (`"sideHustle"` or `"householdMember"`).
- Form fields: `name` (required), `amountMonthly` (required, money input),
  with the same money-input parser and validation copy used elsewhere in the
  drawer.
- Submitting the form calls `useCreateBudgetMonthIncomeItem` with the
  group's `kind`, `isActive: true`, and `scope: "currentMonthOnly"`.
- On success: close the inline form, toast the existing `createSuccess` key,
  let the existing hook invalidation refresh the rows. Do not wipe other
  rows' drafts. The seed effect must merge the new row into drafts without
  overwriting in-session edits.
- Salary group never shows the add affordance.
- Read-only months never show the add affordance.

### 5.5 Footer projection

- Income tab continues to render the shared `EditPeriodFooter` with the
  `projection={ domain: "income", ... }` contract.
- Update the two reducers so they only sum rows where the row IS or WOULD BE
  active:
  - `baseDomainTotal`: server `row.isActive === true` only.
  - `draftDomainTotal`: per-row, use `draft.isActive ?? row.isActive` and
    include the draft's parsed amount; exclude when the effective active is
    false.
- The footer's "income increases free money" sign is already handled in the
  shared projection (`income: +1`). Do not duplicate that here.

### 5.6 Closed / skipped month handling

- The IncomePanel must resolve a `readOnly` boolean and respect it everywhere
  affordances are exposed. Mirror the expense panel's
  `canEditMonth(month.isEditable, month.status)` lookup.
- Use the editor query (`useBudgetMonthEditor`) for the month meta so we don't
  have to invent a parallel month-status fetch. This already runs when the
  drawer is open and the tab is active, and PR C uses the same hook.
- On read-only months: no toggle, no add, no save. The existing
  `footerSummaryReadOnly` copy already covers the message.

### 5.7 i18n

- New keys, all three locales (sv / en / et). Suggested keys:
  - `incomeGroupSalary`, `incomeGroupHousehold`, `incomeGroupSide`
  - `incomeSalaryLockedLabel` — muted helper text on the salary group title
  - `incomeNoSalaryYet` — empty-state for the salary group
  - `incomeNoHouseholdMembers`, `incomeNoSideIncome` — empty-state per group
    when the month is editable
  - `incomeAddToGroup` — "Lägg till i {category}" / "Add to {category}" /
    "Lisa kategooriasse {category}" (kept distinct from the expense key so
    income-specific copy can diverge later)
  - `incomeInlineCreateHeading` — "Ny inkomst i {category}" / "New income in
    {category}" / "Uus tulu kategoorias {category}"
  - `incomeInlineCreateNamePlaceholder`, `incomeInlineCreateAmountPlaceholder`
  - `incomeActiveToggleLabel` — accessible label for the toggle
  - `incomeRowInactiveHint` — small muted label on inactive rows
- Reuse existing keys where copy genuinely matches (`amountRequired`,
  `amountInvalid`, `fixValidationErrors`, `createSuccess`,
  `createErrorGeneric`, `monthClosedReadOnly`, `monthOnlyHelper`,
  `footerSummaryNoChanges`, `footerSummaryReadOnly`, `saveSuccess`,
  `saveErrorGeneric`, `loadingEditor`, `loadMonthError`).
- No hard-coded UI strings in TSX.

## 6. Excluded scope

Do not do any of the following in this PR:

- introduce a cross-domain Save action across tabs
- implement a backend quick-edit aggregate endpoint
- expose delete / remove of income rows in the drawer
- expose rename of income rows in the drawer
- write the budget plan from quick edit (no `updateDefault: true`, no
  `currentMonthAndBudgetPlan`, no `budgetPlanOnly`)
- change the active dashboard projection contract or `quickEditProjection.ts`
  math
- modify the Savings or Debts tabs
- introduce a new icon system, palette, font, or marketing-style treatment
- modify packages, lockfiles, build config, Docker, or CI

If an excluded item seems required to finish the income depth slice, stop and
ask. Do not smuggle product decisions into this PR.

## 7. Acceptance criteria

- Income tab renders three grouped sections in the order
  Salary → Household → Side income.
- Salary row exposes only an amount input; no toggle, no add affordance, no
  destructive action.
- Non-salary rows expose an active/inactive toggle. Toggling alone marks the
  panel dirty.
- Inactive rows do not contribute to `baseDomainTotal` or `draftDomainTotal`.
  The footer projection reconciles with the post-save dashboard total.
- Household and Side income groups expose an "Add" affordance that opens an
  inline create form for that group's `kind`.
- Only one inline create form can be open at a time across both groups.
- Creating a new row calls `useCreateBudgetMonthIncomeItem` with the correct
  `kind`, `isActive: true`, and `scope: "currentMonthOnly"`.
- Save still calls `usePatchBudgetMonthIncomeItemsBulk` with `scope:
  "currentMonthOnly"` and `updateDefault: false` for every changed row.
- Salary rows in the patch payload still send `name: null`; non-salary rows
  send `name: row.name`.
- Read-only months render with no toggle, no add affordance, and the Save
  button disabled; existing copy is preserved.
- Existing relevant `data-testid` values (`period-income-row-{id}`) are
  preserved. New `data-testid` values are added for groups
  (`income-group-{kind}`) and add buttons (`income-group-add-{kind}`).
- All new visible text flows through the existing drawer i18n dictionary in
  sv, en, and et.
- No backend, hook contract, or query-key change in this PR.

## 8. Suggested implementation steps

1. Extract a small `IncomeQuickRow` component from the current inline row in
   `IncomePanel.tsx`. Give it `readOnly`, `showActiveToggle`,
   `isActive`, `onActiveChange`, `error`, and `onAmountChange` props.
2. Add an `InlineCreateIncomeRow.tsx` next to the panel, mirroring
   `InlineCreateExpenseRow.tsx` but with the income create payload shape
   (`kind`, `name`, `amountMonthly`, `isActive: true`, `scope:
   "currentMonthOnly"`).
3. Refactor `IncomePanel.tsx`:
   - swap the in-component query for `useBudgetMonthEditor` (so the panel can
     read the month meta and resolve `readOnly`) OR keep the dedicated income
     items query and add a parallel month query — pick whichever fits the
     existing PR C pattern best with the smallest churn. Document the choice
     in the change entry.
   - group rows by `kind` (salary / household / side); render groups in fixed
     order.
   - render the salary lock label and suppress non-applicable affordances.
   - render the active toggle on non-salary rows; thread `draft.isActive`
     into `changedRows`, `draftErrorsByRowId`, and the save payload.
   - thread the inline create form into household and side groups.
   - update `baseDomainTotal` and `draftDomainTotal` to use the active filter
     described in §5.5.
4. Update `editPeriodDrawer.i18n.ts` for sv / en / et with the new keys in §5.7.
5. Update or add tests (see §9). Keep the EditPeriodDrawer top-level smoke
   tests green; add focused IncomePanel tests for the new behavior.
6. Run focused frontend validation.

## 9. Test expectations

Add or extend tests so the new behavior has component-level coverage.

Minimum coverage:

- Salary row renders without a toggle and without an add affordance for its
  group.
- Non-salary rows render with an accessible active/inactive toggle.
- Toggling a non-salary row off:
  - marks the panel dirty
  - excludes that row from `draftDomainTotal`
  - still sends `isActive: false` in the bulk PATCH on save
- Inline create in the Side income group calls
  `useCreateBudgetMonthIncomeItem` with `kind: "sideHustle"`, `isActive:
  true`, and `scope: "currentMonthOnly"`.
- Inline create in the Household income group calls the create mutation with
  `kind: "householdMember"`.
- Opening one group's inline create closes the other group's affordance.
- Read-only months hide all affordances and disable Save.
- Save payload for a mixed change set (amount edit on salary, toggle off on a
  side row, amount edit on a household row) carries the expected
  `monthIncomeItemId` / `name` / `amountMonthly` / `isActive` / `scope` /
  `updateDefault` for each row.

Focused validation command from `Frontend/`:

```bash
npm run test -- IncomePanel
```

If the repository test runner does not support that exact filter, use the
narrowest available command and document exactly what was run. Do not run the
full expensive suite by default unless local failures require broader proof.

## 10. Follow-up PRs

Expected next slices after this PR:

1. **PR E — Savings reconciliation**: include base savings in the quick total,
   decide the base-vs-goal save boundary, remove or redefine prototype
   "Top up", keep goal contributions as monthly amounts.
2. **PR F — Debt honesty upgrade**: switch the quick debt read to
   `debt-editor`, surface read-only balance/minimum context, surface the
   below-minimum / coversInterestAndFees warning, optionally surface
   skip/include via the rich row actions.
3. **PR G — Hardening and tests**: drawer-level dirty-state tests, Playwright
   smoke for one happy-path quick edit, snapshot of the income/expense
   projection math.

## 11. Validation

Implementation PR. Run the focused frontend tests listed above and report any
commands that could not be run.

Append a short entry to `docs/ai/ai-changelog.md` with date, what changed,
files touched, validation, and risks/follow-up. Write a Conventional Commits
message to `COMMIT_MSG.tmp`. Do not commit, push, or open a PR.
