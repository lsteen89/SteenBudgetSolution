# PR 2 - FE Quick Edit Shell Foundation

| | |
| --- | --- |
| **Type** | Frontend implementation |
| **Depends on** | `PR-00-current-state.md`, `PR-01-designer-handoff-ba-technical-analysis.md` |
| **Blocks** | shared money equation footer, domain-specific quick-edit depth, hardening tests |
| **Risk** | Medium: modal shell and tab state change, no backend change |

## 1. Purpose

Replace the current one-panel-at-a-time dashboard quick drawer with the first
safe version of the designer's tabbed Quick Edit drawer.

This PR is a shell foundation only. It must make the drawer behave like one
Quick Edit module with four tabs, while keeping the existing per-domain editor
contracts intact.

The point is to unlock the new module shape without forcing unresolved BA
decisions into code.

## 2. Source files to read first

Planning:

- `Work/Dashboard/QuickEdit/PR-00-current-state.md`
- `Work/Dashboard/QuickEdit/PR-01-designer-handoff-ba-technical-analysis.md`

Frontend entry points:

- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/returning/ReturningDashboardSection.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/OpenMonthPillarWorkbench.tsx`
- `Frontend/src/components/organisms/dashboard/returning/openMonth/AttentionLane.tsx`

Existing drawer and panels:

- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodHeader.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodFooter.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodSection.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/income/IncomePanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/savings/SavingsPanel.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/debts/DebtsPanel.tsx`

Existing tests and copy:

- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.test.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/expense/ExpensesPanel.scope.test.tsx`
- `Frontend/src/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n.ts`
- `Frontend/src/utils/i18n/pages/private/dashboard/cards/period/editPeriodFooter.i18n.ts`

## 3. Non-negotiable behavior

- Save is active-tab only. There is no cross-domain save in this PR.
- Existing domain mutation endpoints stay unchanged.
- Existing current-month-only quick-edit semantics stay unchanged.
- No new backend endpoint, DTO, repository, or controller work.
- No inline create, delete, active toggle, skip/include, top-up, or balance
  update action is added in this PR.
- No shared "free this month" equation is implemented in this PR. That is the
  next PR after the shell is stable.
- Carry-over must not be treated as income in copy or UI structure.
- Debt copy must keep planned payment separate from balance or actual payment.
- Closed/skipped months must not gain edit affordances. The dashboard normally
  branches away from the drawer, but the drawer/panels should not become less
  defensive than today.
- The prototype JavaScript must not be copied. Rebuild with repo React,
  TypeScript, Tailwind, existing eBudget tokens, and existing i18n patterns.

## 4. Included scope

### Drawer shell

- Keep the existing dashboard launch wiring.
- Keep `DashboardContent` as the owner of drawer open state.
- Treat the existing `periodEditorPanel` value as the initial/active quick edit
  tab. Rename to `quickEditInitialTab` only if it improves clarity without
  broad churn.
- Update `EditPeriodDrawer` or introduce a small `QuickEditDrawer` wrapper
  inside the same `editPeriod` module.
- Render a tab list inside the drawer for:
  - Income
  - Expenses
  - Savings
  - Debts
- Opening from each dashboard pillar must land on the matching tab.
- Switching tabs must not close the drawer.
- Escape, overlay click, close button, body scroll lock, and focus behavior
  must remain at least as good as today.

### Lazy tab mounting

- The active tab should load immediately.
- Other tab panels should lazy-load on first visit.
- Visited tab drafts should remain mounted while the drawer stays open, unless
  an existing panel makes that unsafe.
- Do not eager-fetch all four editor endpoints on drawer open.

Implementation note: if the existing `open` prop currently couples visibility,
query enabling, and draft reset, split that responsibility with the smallest
local change. For example, keep the component mounted for a visited tab, pass
an active flag for query enabling, and avoid resetting draft state merely
because the tab is hidden.

### Active-tab save honesty

- The visible save controls must clearly apply only to the active tab.
- Dirty state from hidden tabs may be shown as a tab dot if it can be done with
  local, reliable state. It is not required for this PR.
- If dirty dots are added, they must not imply that one Save button persists
  every dirty tab.
- Existing panel-level save handlers remain responsible for their own domain
  mutation, invalidation, loading, error, and validation states.

### Styling

- Use existing eBudget tokens and primitives.
- Keep the drawer calm, dense enough for budgeting work, and consistent with
  the current application shell.
- Do not introduce a new color palette, font, icon system, page background, or
  marketing-style treatment.
- Use tabs/segmented controls, not four large cards.
- Make the active tab and disabled/saving states obvious.

### i18n

- All new visible text must go through the existing dashboard period editor
  i18n pattern.
- Add keys for all three locales: `sv`, `en`, and `et`.
- No hard-coded UI strings in TSX.

## 5. Excluded scope

Do not do any of the following in this PR:

- implement the shared money equation footer
- calculate projected free money
- add cross-domain frontend save orchestration
- add a backend cross-domain command
- expose fixed/housing expense editability beyond current behavior
- add expense inline create/delete behavior
- add income create/delete/active toggles
- add base savings editing
- define savings "Top up"
- switch debt quick edit to the rich `debt-editor` model
- expose debt balance adjustment or skip/include actions
- rewrite full editor pages
- modify packages, lockfiles, build config, Docker, or CI

If an excluded item seems required to finish the shell, stop and ask. Do not
smuggle product decisions into the foundation PR.

## 6. Acceptance criteria

- Quick-adjust from Income opens the drawer on the Income tab.
- Quick-adjust from Expenses opens the drawer on the Expenses tab.
- Quick-adjust from Savings opens the drawer on the Savings tab.
- Quick-adjust from Debts opens the drawer on the Debts tab.
- User can switch between all four tabs without closing the drawer.
- Only the active or previously visited tab panels are mounted.
- Opening the drawer does not fetch every domain editor endpoint.
- Saving on a tab calls only that domain's existing mutation path.
- Current month-only payload semantics are unchanged:
  - expenses still send `scope: "currentMonthOnly"` and `updateDefault: false`
  - income still sends `scope: "currentMonthOnly"` and `updateDefault: false`
  - savings goals still send `scope: "currentMonthOnly"`
  - debts still send `scope: "currentMonthOnly"`
- Existing full-editor navigation still goes to:
  - `/dashboard/income`
  - `/dashboard/expenses`
  - `/dashboard/savings`
  - `/dashboard/debts`
- Existing read-only, validation, error, and loading behavior does not regress.
- Existing relevant `data-testid` values are preserved unless the test update
  documents a justified replacement.

## 7. Suggested implementation steps

1. Add a small tab model for the four quick edit domains.
2. Refactor `EditPeriodDrawer` into a shell with:
   - modal/overlay responsibilities
   - header
   - tab list
   - visited-tab state
   - active panel region
3. Keep the existing panel components as the first tab content.
4. Ensure inactive unvisited panels are not mounted.
5. Ensure inactive visited panels do not fetch or save in the background.
6. Update i18n dictionaries for tab labels and active-tab save copy.
7. Update drawer tests for initial tab, tab switching, lazy mounting, and
   active-tab-only save behavior.
8. Run focused frontend validation.

## 8. Test expectations

Update or add tests around `EditPeriodDrawer`.

Minimum coverage:

- renders the correct initial tab from the `panel` prop
- switches tabs without closing the drawer
- does not render unvisited tab panel content before first visit
- keeps a visited tab mounted while switching away if draft persistence is
  implemented in this PR
- save from Income calls only the income bulk patch hook
- save from Expenses calls only the expense bulk patch hook
- save from Savings calls only the savings bulk patch hook
- save from Debts calls only the debt bulk patch hook
- Escape still calls `onClose`
- overlay click still calls `onClose`
- tab labels are accessible by role/name

Focused validation command from `Frontend/`:

```bash
npm run test -- EditPeriodDrawer
```

If the repository test runner does not support that exact filter, use the
narrowest available command that runs the affected drawer tests. Do not run a
full expensive suite by default unless local failures require broader proof.

## 9. Follow-up PRs

Expected next slices after this PR:

1. Shared money equation and active-domain footer projection.
2. Expenses parity with the design after BA decides fixed/housing, cancelled
   subscription semantics, inline create, and delete.
3. Income grouping and approved row actions.
4. Savings reconciliation with base savings and goal contributions.
5. Debt honesty upgrade using the rich debt editor read model.
6. Hardening, component tests, and one Playwright smoke path.

## 10. Validation

Implementation PR. Run the focused frontend tests listed above and report any
commands that could not be run.

