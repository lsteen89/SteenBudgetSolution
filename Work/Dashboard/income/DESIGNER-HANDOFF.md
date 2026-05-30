# Income Editor — Implementation Handover

Date: 2026-05-29

Status: design approved, ready to build after the implementation plan is
accepted.

## Source Of Truth

Designer-provided references:

- `explorations/income/MVP-Income v1.html`
  - visual and behavioral source of truth
  - working clickable mockup
  - do not port inline JS, mock `data-*` attributes, or the Tweaks panel
- `explorations/income/income-editor-brief.md`
  - product/domain brief
  - backend reality and constraints
- `explorations/expenses/MVP-Expenses v1.html`
  - sibling editor reference

Repo note: those `explorations/*` files are not present in this checkout at
the time this planning pass was written. The implementation plan below uses
the handover text supplied in the task plus the real repo analysis. If the
mockup files are added later, PR 1 must inspect them before implementation.

## Product Frame

Income is the top of the budget funnel.

The page must answer:

```text
inkomst + överskott från förra månaden - utgifter - sparande - skulder = fritt kvar
```

The page is not a simple income-source list. It must show what income needs to
cover and what is genuinely free after committed outflows.

## Reuse The Expenses Grammar

This is the second instance of the canonical money-flow editor.

Use the same product grammar as expenses:

- compact glass hero with one primary action
- supporting budget-impact strip
- grouped editable ledger cards
- right-aligned tabular money
- quiet normal rows
- inline pills only for real exceptions
- row kebab menu for secondary/destructive actions
- scope-aware edit drawer with live preview
- footer with only `Avbryt` and `Spara`

This is also the right time to extract shared editor shell/row/drawer
primitives into `Frontend/src/components/molecules/forms/budgetEditor/*`.
Extraction must be small and proven by keeping expenses visually unchanged.

## Page Anatomy

### Hero

- eyebrow: `Inkomst · {månad}`
- headline: `Du planerar {totalInkomst} i inkomst denna månad`
- split line:
  `{lön} lön · {hushåll} hushåll · {sidoinkomst} sidoinkomst · {frittKvar} fritt kvar`
- global add button: `Lägg till inkomst`
- income MoM delta only if backed by real previous-month data
- income increase is positive/green
- read-only marker when applicable
- compact height; mascot is decorative only

### Distribution Strip

Title: `Månadens fördelning`.

Headline: `{frittKvar} fritt kvar`.

Status:

- calm positive when income plus carry-over covers committed outflows
- calm warn, never alarm red, when committed outflows exceed available money

Explanation:

```text
Så här fördelas inkomsten den här månaden — utgifter, sparande och skulder först, resten är fritt kvar.
```

Breakdown terms:

- `Inkomst`
- `Överskott från {förra månaden}`
- `Utgifter`
- `Sparande`
- `Skulder`
- `Fritt kvar`

Carry-over must be shown separately from income.

The proportional bar shows where income goes:

- `Utgifter`
- `Sparande`
- `Skulder`
- `Fritt kvar`

Use distinct solid colors and clear gaps. Zero terms still appear in the
breakdown as `0 kr`; zero-width bar segments are omitted.

Every displayed number must reconcile to the shown `fritt kvar`.

### Groups

Order:

1. `Lön`
2. `Hushållsinkomst`
3. `Sidoinkomst`

Descriptions:

- `Lön`: `Din återkommande huvudsakliga inkomst.`
- `Hushållsinkomst`: `Inkomster från hushållet som räknas in i budgeten.`
- `Sidoinkomst`: `Extra inkomster som kan variera mellan månader.`

Naming is locked: use `Sidoinkomst`, not `Sidointäkt`.

Each group header shows:

- title
- active/inactive count
- right-aligned group total with `Per månad`
- group-level `Lägg till` button when editable
- one description line

Inactive rows are visible by default in a quiet subsection at the end of the
group:

```text
Inaktiva — räknas inte i totalen för {månad}
```

### Rows

Row layout:

- name left
- secondary meta under name as plain text
- amount right-aligned, tabular
- kebab far right

Secondary meta examples:

- `Återkommande`
- `Återkommande · utbetalas den 20:e`
- `Månadslön efter skatt`

Do not render meta as a pill.

Kebab menu actions:

- `Redigera`
- `Inaktivera denna månad`
- `Aktivera för {månad}`
- `Ta bort från {månad}`

Read-only months show no actionable kebab.

## Row State Model

Normal plan-linked recurring rows are quiet. Do not show a `Plan` pill.

Only show exception pills:

- `Bara {månad}` when `SourceIncomeItemId == null`
- `Ändrad i {månad}` only after backend source-plan fields exist
- `Inaktiv denna månad` when the month row is inactive

Never use:

- `Plan`
- `Pausad`
- `Avbruten`
- `paused`
- `cancelled`
- subscription lifecycle labels

Income has no lifecycle beyond `IsActive`.

## Salary Rules

Salary is special:

- amount is editable
- name is not editable
- name field is disabled with hint:
  `Namnet på din lön kan inte ändras.`
- always active
- active toggle is shown disabled/locked with sub-text:
  `Din lön är alltid aktiv.`
- cannot be deleted
- kebab shows only `Redigera`
- no scope cards in the drawer
- no row lock icon

## Add Actions

Global hero `Lägg till inkomst`:

- type unknown
- drawer shows `Typ av inkomst` selector
- sub-copy:
  `Välj typ av inkomst och fyll i beloppet. Skapas bara i {månad}.`

Group `Lägg till`:

- type known from group
- drawer hides type selector
- sub-copy:
  `Skapas bara i {månad}. Du kan lägga till den i planen efteråt.`

Create is month-only unless backend behavior changes deliberately.

## Drawer Order

Order:

1. fields
2. active/month status
3. scope when applicable
4. live preview
5. footer

Create:

- month-only
- show callout:
  `Gäller bara {månad}. Den här posten läggs bara till i {månad}.`
- no future-plan implication

Edit scopes for plan-linked non-salary rows:

- `Bara denna månad` => `currentMonthOnly`
- `Denna månad + planen framåt` => `currentMonthAndBudgetPlan`
- `Bara planen framåt` => `budgetPlanOnly`

Month-only rows disable plan-writing scopes with:

```text
Inte tillgängligt — den här raden finns inte i planen.
```

Live preview:

- `Förhandsvisning`
- `{månad} {år} — total inkomst`
- `Budgetplanen framåt`
- positive income deltas are green/neutral, never red

Footer contains only:

- `Avbryt`
- `Spara`

Destructive actions stay in row kebabs.

## Backend Honesty Gates

Real data model:

- income kinds: `salary`, `householdMember`, `sideHustle`
- no income categories
- two layers: budget plan and selected budget month
- month rows may link to plan rows or be month-only
- create is month-only today
- delete soft-deletes the month row only
- totals sum non-deleted, active month rows
- bulk edits must use the transactional bulk patch hook
- closed/skipped months are read-only in UI and rejected by backend

Mockup numbers are illustrative. The implementation may only show real
dashboard totals. Do not fake savings, debt, carry-over, or MoM values.

The `Ändrad i {månad}` pill and plan deltas require backend fields:

```text
sourceName
sourceAmountMonthly
sourceIsActive
```

Until those exist, show only:

- `Bara {månad}`
- `Inaktiv denna månad`

## Non-shippable Mockup Parts

Do not ship:

- inline mockup script logic
- mock `data-*` attributes
- Tweaks panel
- hardcoded Swedish strings in components
- density toggles
- inactive placement toggles
- month-state toggles

Chosen defaults:

- inactive rows in own subsection
- changed pill only with backend support
- comfortable density
- open month has full affordances
- closed/read-only month has no edit affordances

## Acceptance Criteria

- Income page is visually consistent with expenses.
- Editable groups appear early.
- Sparse data feels intentional.
- `Fritt kvar` wording is consistent.
- Salary is editable for amount, locked for name, always active, not deletable.
- Global add and group add have distinct drawer behavior.
- Normal rows are quiet; exceptions are visible.
- No `Plan` pills.
- Distribution strip reconciles to a real `fritt kvar`.
- Drawer order is fields, status, scope, preview, footer.
- No banned implementation/lifecycle copy appears.
- Closed/read-only months expose no edit affordances.
- Income increases read green.
- Red is reserved for destructive actions.
- `npm run build` passes from `Frontend/`.
- Focused Vitest coverage exists for changed income utilities/components.
- Manual desktop and mobile browser pass is completed on `/dashboard/income`.

Manual states:

- loading
- no open month
- open editable month
- read-only/closed month
- empty groups
- month-only row edit
- plan-linked row edit
- `budgetPlanOnly` preview
- create via global add
- create via group add
- delete confirmation
- inactive row display
- income below committed outflows

## Resolved Decisions

- month-only income is grouped inline within its kind
- inactive rows are visible in an own quiet subsection
- salary has no row lock icon
- zero equation terms still render as `0 kr`
- plan deltas are minimal and backend-gated

## Open Product Questions

These are not blockers:

- whether salary eventually moves to a dedicated salary settings surface
- final prominence of plan-delta UI after source-plan fields exist
