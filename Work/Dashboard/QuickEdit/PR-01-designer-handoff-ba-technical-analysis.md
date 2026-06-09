# PR 1 - Designer Handoff BA And Technical Analysis

| | |
| --- | --- |
| **Type** | BA / technical analysis, no production code |
| **Depends on** | `PR-00-current-state.md`, designer handoff archive |
| **Blocks** | Implementation prompt sequence |
| **Risk** | Medium if product decisions are skipped |

## 1. Source material

Designer handoff archive:

- `/Users/linussteen/Downloads/eBudget Design System-handoff.tar.gz`

Primary files inside the archive:

- `ebudget-design-system/README.md`
- `ebudget-design-system/project/README.md`
- `ebudget-design-system/project/explorations/quickEdit/quick-edit-drawer.html`
- `ebudget-design-system/project/explorations/quickEdit/app.jsx`
- `ebudget-design-system/project/explorations/quickEdit/data.jsx`
- `ebudget-design-system/project/explorations/quickEdit/atoms.jsx`
- `ebudget-design-system/project/explorations/quickEdit/panelKit.jsx`
- `ebudget-design-system/project/explorations/quickEdit/panelsA.jsx`
- `ebudget-design-system/project/explorations/quickEdit/panelsB.jsx`
- `ebudget-design-system/project/explorations/quickEdit/pillars.jsx`
- `ebudget-design-system/chats/chat12.md`

Existing repo files used for mapping:

- `Work/Dashboard/QuickEdit/PR-00-current-state.md`
- `Frontend/src/components/organisms/pages/DashboardContent.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/EditPeriodDrawer.tsx`
- `Frontend/src/components/organisms/dashboard/editPeriod/*`
- `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`
- `Frontend/src/api/Services/Budget/editor/monthEditor.api.ts`
- `Frontend/src/types/budget/BudgetMonthsStatusDto.ts`
- `Frontend/src/types/budget/BudgetDashboardDto.ts`
- `Frontend/src/types/budget/DebtEditorDto.ts`
- `Backend/Presentation/Controllers/Budget/BudgetController.Editor.*.cs`

## 2. What the designer actually proposes

This is not just "make the current drawer prettier".

The handoff proposes replacing the current one-panel-at-a-time drawer with a
single **Quick Edit drawer module**:

- right-side drawer launched from dashboard pillar quick actions
- tabs inside the drawer:
  - Income
  - Expenses
  - Savings
  - Debts
- dirty indicators per tab
- a compact hero per domain
- a context strip per domain
- grouped rows with inline amount inputs
- lightweight inline create in some domains
- domain-specific row actions through kebab menus
- shared sticky footer with "what this changes"
- one shared money equation:

```text
income + carry-over - expenses - savings - debts = free this month
```

The core design intent is good: every edit should show how it affects the same
"free this month" number, while preserving domain honesty.

The prototype is also intentionally exploratory. It contains tweak controls for
row pattern, footer summary style, density, savings base visibility, and debt
context. Those are design exploration switches, not production settings.

## 3. Non-negotiable product rules

These must travel into every implementation prompt.

- Carry-over is not income. It must stay its own term in the equation.
- Expenses, savings, and debts reduce free money. Income increases it.
- Savings total must reconcile as base savings plus goal contributions.
- Debt planned payment is not actual payment and does not reduce balance in the
  quick drawer.
- Debt balance is read-only context unless the user enters a dedicated balance
  update flow.
- Closed/skipped months are read-only. Do not rely only on the dashboard route
  branch; quick-edit panels should remain defensively read-only.
- Do not introduce transaction/spending language. This product edits plans,
  not bank transactions.
- Do not copy prototype JavaScript. Rebuild with repo React/TypeScript,
  Tailwind, existing tokens, existing hooks, and existing i18n pattern.

## 4. Main technical conflict: cross-domain save

The prototype keeps drafts for all four tabs and has one `Save changes` button
enabled when any tab is dirty.

That does not match the backend transaction model.

Current backend supports transactional bulk saves per domain:

- expenses bulk PATCH is one transaction
- income bulk PATCH is one transaction
- savings goals bulk PATCH is one transaction
- debts bulk PATCH is one transaction

There is no cross-domain quick-edit command that saves income + expenses +
savings + debts in one transaction.

So a production implementation has two honest options:

1. **Active-tab save, recommended for first implementation**
   - User can switch tabs inside the drawer.
   - Drafts can persist per tab.
   - Save applies only the active tab.
   - Footer copy must say which domain will be saved.
   - Dirty dots can show unsaved changes in other tabs, but the active footer
     must not imply those will be saved.

2. **New backend cross-domain command, later**
   - Add one endpoint, for example:
     `PATCH /api/budgets/months/{yearMonth}/quick-edit`
   - Payload contains optional income/expense/savings/debt sections.
   - Handler runs all sections in one UnitOfWork transaction.
   - Response returns refreshed affected rows and recalculated dashboard terms.

Do not ship sequential frontend saves while presenting them as one safe save.
That is how we create partial financial state and lie to the user.

## 5. "Free this month" calculation

Use the live dashboard terms as the baseline:

```text
baseFree =
  income + carryOver - expenses - savings - debts
```

For active-tab-only editing:

```text
projectedFree =
  baseFree + sign[domain] * (draftDomainTotal - baseDomainTotal)
```

Signs:

- income: `+1`
- expenses: `-1`
- savings: `-1`
- debts: `-1`

For future cross-domain saving:

```text
projectedFree =
  draftIncome + carryOver - draftExpenses - draftSavings - draftDebts
```

Do not recompute closed-month snapshots in this module. Closed/skipped month
state should render read-only or not render mutation controls.

## 6. Data-loading strategy

Current dashboard already has enough to draw the launch context and base
equation:

- income total
- expense total
- base savings
- goal savings
- total savings
- debt payment total
- carry-over
- final balance/free amount

The drawer still needs editor endpoints for writable rows.

Recommended first implementation:

- Drawer opens with the requested tab.
- Active tab query loads immediately.
- Other tab queries lazy-load on first visit.
- Drafts stay mounted while the drawer remains open.
- Query invalidation remains centralized through
  `invalidateBudgetMonthEditingQueries`.
- After successful save, refetch dashboard month and affected editor query.

Avoid eager-fetching every editor endpoint on drawer open unless performance is
measured. The dashboard should not pay for all four editors when the user only
wants one quick adjustment.

## 7. Replacement architecture

Replace the existing drawer internals, not the dashboard route wiring.

Current shell:

- `DashboardContent` owns `isPeriodEditorOpen` and `periodEditorPanel`
- `EditPeriodDrawer` receives selected panel
- each panel owns its own query and mutation

Recommended target shape:

- keep `DashboardContent` handlers
- rename `periodEditorPanel` concept to `quickEditInitialTab` only if useful
- make `EditPeriodDrawer` the new tabbed shell, or introduce
  `QuickEditDrawer` and have `EditPeriodDrawer` wrap it during migration
- extract shared quick-edit primitives:
  - `QuickEditDrawerShell`
  - `QuickEditTabs`
  - `QuickEditPanelHero`
  - `QuickEditContextStrip`
  - `QuickEditGroupCard`
  - `QuickEditAmountInput`
  - `QuickEditFooter`
  - domain row components

Do not create a parallel design system. Use existing eBudget tokens/classes:

- `bg-eb-surface`
- `border-eb-stroke`
- `text-eb-text`
- `text-eb-accent`
- `shadow-eb`
- existing button components where they fit

## 8. Domain mapping

### Income

Designer behavior:

- grouped by Salary, Household, Side income
- inline amount edits
- active/inactive action for non-salary rows
- inline add inside a group
- footer treats income increases as good

Current backend support:

- read rows: `GET /months/{yearMonth}/income-items`
- bulk patch rows: `PATCH /months/{yearMonth}/income-items`
- create side/household row: `POST /months/{yearMonth}/income-items`
- delete side/household row: `DELETE /months/{yearMonth}/income-items/{id}`
- `isActive` supported for side/household rows
- salary special-cased by backend; salary name cannot be user-edited

Implementation notes:

- Salary row should be visually locked for name/type/delete.
- Inline add must know the target kind:
  - household group creates `kind: "householdMember"`
  - side group creates `kind: "sideHustle"`
  - salary group should not expose add
- Create should be month-only in the quick drawer unless BA explicitly allows
  plan-writing from quick edit.
- Current prototype's "Remove from May" is supported for non-salary rows.

BA decisions:

- Should inactive income rows remain visible or be hidden?
- Should quick add be month-only only?
- Should active/inactive be exposed in quick edit or left to full editor?

### Expenses

Designer behavior:

- grouped categories, including housing
- amount edits for all groups
- inline add per group
- subscription lifecycle control:
  - active
  - paused
  - ending/cancelled
- remove row action

Current backend support:

- read combined editor rows: `GET /months/{yearMonth}/editor`
- category read exists through current FE hooks
- bulk patch: `PATCH /months/{yearMonth}/expense-items`
- create row: `POST /months/{yearMonth}/expense-items`
- delete row: `DELETE /months/{yearMonth}/expense-items/{id}`
- subscription lifecycle field is supported
- source-plan comparison fields exist on the expense editor row DTO

Implementation notes:

- Current quick drawer excludes housing/fixed/subscription from normal rows.
  Prototype includes housing and subscriptions. This is a product change.
- Subscription `paused` should count as `0` this month.
- Subscription `cancelled` currently counts this month in the prototype and
  communicates "last charge"; confirm backend semantics before copying that.
- Inline add can be month-only with existing create endpoint.

BA decisions:

- Should housing/fixed expenses be quick-editable?
- What exactly does cancelled mean for the current month total?
- Should delete be available in the quick drawer, or only in full editor?

### Savings

Designer behavior:

- total reconciles as base saving + goals
- base saving row is shown by default
- goal rows show progress and contribution amount
- "Top up" inline add in prototype
- base and goals affect free money neutrally, not red/green

Current backend support:

- savings goals read: `GET /months/{yearMonth}/savings-goals`
- savings goals bulk patch: `PATCH /months/{yearMonth}/savings-goals`
- base savings patch: `PATCH /months/{yearMonth}/base-savings`
- savings methods read/mutate exists
- create goal exists, but requires real goal fields
- one-time transfer exists for existing goals

Implementation notes:

- The prototype's base savings decision is correct. Quick edit must include
  base savings if the footer claims to edit the savings total.
- Base savings cannot be saved in the same request as goal contributions today.
  That is another save-boundary issue inside savings itself.
- Prototype "Top up" is not directly implementable as a bare new row:
  `CreateBudgetMonthSavingsGoalRequestDto` requires target amount and target
  date, and one-time transfer targets an existing goal.
- "Pause contribution" should not remove a goal row from the draft. It should
  set `monthlyContribution` to `0` for the chosen scope, or use the full
  lifecycle action if BA wants a stronger state.

BA decisions:

- Is base savings editable in quick edit? Recommendation: yes.
- Should one-time transfer be available in quick edit? Recommendation: no for
  first implementation; deep-link to full editor.
- What should "Top up" mean: increase monthly contribution, one-time transfer,
  or create a new goal? These are not the same.

### Debts

Designer behavior:

- only planned monthly payment is directly editable
- balance and minimum payment are fenced read-only context
- debt row can be skipped for the month
- below-minimum warning appears when planned payment is below minimum
- update balance exists as a row action, not inline amount editing

Current backend support:

- simple read: `GET /months/{yearMonth}/debt-items`
- rich read: `GET /months/{yearMonth}/debt-editor`
- bulk planned payment patch: `PATCH /months/{yearMonth}/debt-items`
- participation skip/include:
  `POST /months/{yearMonth}/debt-items/{id}/participation`
- balance adjustment:
  `POST /months/{yearMonth}/debt-items/{id}/balance-adjustments`
- create, details patch, paid-off, archive, restore, remove exist
- rich read model carries row actions and disabled reasons

Implementation notes:

- Quick edit should switch from legacy `debt-items` read to the rich
  `debt-editor` read model if it exposes skip/include or action menus.
- Below-minimum warning can use `minPayment`.
- Better warning exists in `DebtEditorDto.paymentBreakdown`:
  `coversInterestAndFees`.
- Do not label planned payment as "payment made".
- Do not show balance update inline unless it uses the dedicated
  non-idempotent balance-adjustment flow with duplicate-submit protection.

BA decisions:

- Should quick edit allow skip/include? Recommendation: yes if using rich
  debt-editor actions and disabled reasons.
- Should quick edit allow balance update? Recommendation: not in phase 1;
  link/open full editor.
- Should planned payment below minimum block save or warn only? Recommendation:
  warn only unless backend validator blocks it.

## 9. Technical gaps to close before implementation

Must resolve before coding:

- active-tab save vs cross-domain save
- whether quick edit may write plan scopes or current-month only
- savings base + goals save boundary
- savings "Top up" meaning
- expense cancelled subscription counting rule
- debt quick actions allowed in drawer
- whether delete/remove actions are allowed in a quick surface

Likely code gaps:

- shared quick-edit primitives do not exist yet
- current `EditPeriodFooter` assumes one domain and one generic summary
- income/savings/debts panels lack read-only and validation UX parity
- debt quick panel uses legacy read model
- savings quick panel ignores base savings
- no i18n dictionary exists for the new unified module
- no tests cover tabbed dirty-state behavior

## 10. Recommended implementation sequence

### PR A - Shell replacement foundation

Scope:

- introduce tabbed quick-edit drawer shell
- keep current domain panels wired with minimal adaptation
- no new domain actions yet
- footer clearly says active-tab save only
- preserve existing dashboard open handlers

Done when:

- dashboard quick buttons open the drawer on the correct tab
- user can switch tabs
- active tab lazy-loads its data
- drawer remains keyboard closable
- no financial behavior changes yet

### PR B - Shared money equation and footer

Scope:

- derive base terms from dashboard live data
- implement active-domain projected free amount
- implement domain-aware delta semantics
- keep carry-over separate

Done when:

- footer preview matches the six-term equation
- income increase raises free money
- expense/savings/debt increase lowers free money
- no stale preview after save/refetch

### PR C - Expenses parity with design

Scope:

- group rows by category
- decide and implement fixed/housing behavior
- improve subscription lifecycle row
- add inline month-only create only if BA approves
- add delete only if BA approves

Done when:

- subscription totals are correct for active/paused/cancelled
- validation/read-only behavior remains at least as strong as today

### PR D - Income domain depth

Scope:

- group salary/household/side income
- salary locked behavior
- active toggle and remove for non-salary if BA approves
- inline add for household/side if BA approves

Done when:

- salary cannot be deleted or renamed
- inactive rows do not count in totals
- footer preview uses income-positive semantics

### PR E - Savings reconciliation

Scope:

- include base savings in quick edit
- keep goal monthly contribution rows
- decide base save + goal save behavior
- remove or redefine prototype "Top up"

Done when:

- savings quick total equals base savings + goal contributions
- base savings can be changed or is explicitly shown as read-only/deep-linked
- no fake one-time transfer UI exists

### PR F - Debt honesty upgrade

Scope:

- switch quick debt read to `debt-editor`
- show balance/minimum as read-only context
- show below-minimum or interest/fee warning
- optionally expose skip/include if BA approves

Done when:

- planned payment, balance, and minimum payment are visually separate
- balance does not change from planned-payment edit
- disabled actions follow backend row permissions

### PR G - Hardening and tests

Scope:

- unit tests for projection math
- panel tests for read-only and validation states
- drawer tests for tab switching and dirty drafts
- Playwright smoke for one happy-path quick edit

Done when:

- changed quick-edit behavior is covered at the component level
- no domain silently regresses to the old amount-only drawer

## 11. Recommendation

Build this as a replacement module, but do not implement the prototype literally.

Best first version:

- tabbed drawer
- lazy-loaded active tab
- active-tab save only
- current-month-only mutations
- footer preview tied to the six-term equation
- savings includes base savings
- debt uses rich read model for context, but keeps balance updates in full editor

That gets the new module into a good state without pretending we have a
cross-domain financial transaction or inventing savings/debt semantics the
backend does not support.

## 12. Validation

Documentation-only. No build or test run required.
