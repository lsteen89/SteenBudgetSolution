# Work — Dashboard / Income

Planning folder for the **income editor redesign**. Implementation starts only
after the user gives an explicit `GO` for the next PR file.

## How to use this folder

Each `PR-NN-*.md` file is a scoped implementation brief. Open one file,
implement that PR only, validate it, append `docs/ai/ai-changelog.md`, write
`COMMIT_MSG.tmp`, then stop. Do not commit or push.

For design work, start with:

1. `DESIGNER-HANDOFF.md`
2. `IMPLEMENTATION-PLAN.md`
3. the specific `PR-NN-*.md` file being implemented

The designer references `explorations/income/MVP-Income v1.html`,
`explorations/income/income-editor-brief.md`, and
`explorations/expenses/MVP-Expenses v1.html`. Those files are not present in
this checkout at planning time. If they are added later, inspect the mockup
before PR 1 implementation.

## Source material

- `AGENTS.md`
- `PROJECT.md`
- `.agents/instructions/backend.instructions.md`
- `.agents/instructions/frontend-ui.instructions.md`
- `docs/money-flow-editor-ux-alignment.md`
- `Work/Dashboard/income/DESIGNER-HANDOFF.md`
- `Work/Dashboard/income/IMPLEMENTATION-PLAN.md`
- Existing income editor:
  - `Frontend/src/Pages/private/income/IncomeEditorPage.tsx`
  - `Frontend/src/Pages/private/income/components/*`
  - `Frontend/src/utils/i18n/pages/private/income/*`
- Completed sibling editor:
  - `Frontend/src/Pages/private/expenses/ExpensesEditorPage.tsx`
  - `Frontend/src/Pages/private/expenses/components/*`
  - `Frontend/src/Pages/private/expenses/utils/buildExpenseLedgerGroups.ts`
  - `Work/Dashboard/Expenses/*`
- Modal/shell reference:
  - `Frontend/src/Pages/private/savings/SavingsEditorPage.tsx`
  - `Frontend/src/Pages/private/savings/components/SavingsGoalMonthlyModal.tsx`
  - `Frontend/src/Pages/private/savings/components/SavingsBaseHabitDialog.tsx`
  - `Frontend/src/components/molecules/forms/editScope/EditScopeRadioCards.tsx`
  - `Frontend/src/components/molecules/forms/budgetEditor/*`
- Backend income/month paths:
  - `Backend/Presentation/Controllers/Budget/BudgetController.Editor.Income.cs`
  - `Backend/Application/Features/Budgets/Months/Editor/Income/*`
  - `Backend/Infrastructure/Repositories/Budget/Months/Editor/Income/*`
  - `Backend/Application/Services/Budget/Materializer/BudgetMonthMaterializer.cs`
  - `Backend/Infrastructure/Repositories/Budget/Months/Seed/*`
  - `database/init/01-full-schema.sql`
  - `database/init/04-MonthlyLifeCycle.sql`

## Verified Current Backend State

Income has three row kinds:

- `salary`
- `sideHustle`
- `householdMember`

Baseline budget-plan storage:

- `Income`
  - one row per budget
  - stores salary amount/frequency and salary payment timing
- `IncomeSideHustle`
  - plan rows for side income
  - has `IsActive` and `EndedAt`
- `IncomeHouseholdMember`
  - plan rows for household-member income
  - has `IsActive` and `EndedAt`

Month storage:

- `BudgetMonthIncome`
  - one row per budget month
  - stores materialized salary and payment timing
  - `SourceIncomeId` links back to `Income`
- `BudgetMonthIncomeSideHustle`
  - materialized side-income rows
  - `SourceSideHustleId` links to plan row, nullable for month-only rows
- `BudgetMonthIncomeHouseholdMember`
  - materialized household-income rows
  - `SourceHouseholdMemberId` links to plan row, nullable for month-only rows

APIs under `/api/budgets`:

- `GET /months/{yearMonth}/income-items`
- `POST /months/{yearMonth}/income-items`
- `PATCH /months/{yearMonth}/income-items/{monthIncomeItemId}`
- `PATCH /months/{yearMonth}/income-items`
- `DELETE /months/{yearMonth}/income-items/{monthIncomeItemId}`

Other income-related API:

- `PUT /api/users/salary-payment-timing`

There is no income-category endpoint and no income category table. Income type
is the hardcoded `kind`, not a category model.

## Verified Current Frontend State

Existing frontend surface:

- `IncomeEditorPage.tsx`
  - selects the open month from `useBudgetMonthsStatusQuery`
  - loads `useBudgetMonthIncomeItems`
  - loads dashboard aggregate for income/expense/remaining metrics
  - uses `BudgetEditorWorkspaceBar`, not the expense MVP hero
  - creates, patches, and deletes one row at a time
- `IncomeLedgerSection.tsx`
  - one flat income section
  - salary first by backend order, then household, then side income
  - row kebab menu already uses `BudgetEditorRowActionsMenu`
  - inactive rows show `paused` copy today, which is wrong for income
- `IncomeItemModal.tsx`
  - uses shared `BudgetEntryModalShell`
  - uses shared `EditScopeRadioCards`
  - create mode is already month-only
  - salary row name is locked
  - salary row active toggle is hidden and forced active
- `DeleteIncomeItemDialog.tsx`
  - month-only delete copy

Types and hooks:

- Income DTO types live in `Frontend/src/types/budget/BudgetMonthsStatusDto.ts`.
- Hooks live in `Frontend/src/hooks/budget/editPeriod/useMonthEditor.ts`.
- Bulk income hook already exists, but the page currently uses single-row patch.
- There are no income-specific `utils/` or `types/` folders today.
- Global add and group add do not yet have distinct drawer behavior.

## Real Backend Gaps

Backend supports the editor contract better than the current UI shows:

- three edit scopes already exist
- plan-writing scopes already require a source income item
- create is truly current-month-only
- bulk patch is real transactional bulk
- closed/skipped months are rejected for mutations

The important missing read-model support is plan comparison:

- `BudgetMonthIncomeItemEditorRowDto` exposes current row fields and
  `sourceIncomeItemId`
- it does **not** expose source-plan name, amount, or active state
- therefore the frontend cannot honestly render `Ändrad i {månad}` or money
  deltas versus plan yet

Do not fake income plan deltas from frontend state. Add a backend read-model
join first, mirroring the completed expense source-plan fields.

## Design Constraints

- Income is the top of the funnel.
- Show the full equation:
  `income + carry-over - expenses - savings - debts = remaining`.
- User-facing wording must use `Fritt kvar` consistently.
- Use `Sidoinkomst`, not `Sidointäkt`.
- Positive income changes are good/green.
- Do not copy subscription lifecycle. Income has no paused/cancelled lifecycle.
- Use only meaningful exceptions:
  - `Bara {månad}`
  - `Ändrad i {månad}` only after source-plan read fields exist
  - `Inaktiv denna månad`
- Do not show loud `Plan` pills for normal linked rows.
- Create mode remains month-only.
- Global add shows a type selector; group add hides it and preselects the kind.
- Plan-writing scopes are valid only when `sourceIncomeItemId != null`.
- Salary has no scope cards, no delete action, a locked name, and always-active
  status.
- Closed/skipped/read-only months must not expose create, edit, delete, or row
  action affordances.
- User copy must not say `baseline`, `default`, `source`, `linked row`,
  `paused`, `cancelled`, or `subscription`.

## Recommended PR Queue

| PR | File | Title | Depends on | Side |
| --- | --- | --- | --- | --- |
| 0 | `PR-00-source-analysis.md` | Source analysis and implementation contract | — | Docs |
| 1 | `PR-01-fe-shared-editor-foundation.md` | Extract shared money-flow editor primitives | PR 0 | FE |
| 2 | `PR-02-fe-hero-allocation-strip.md` | Income hero and distribution equation strip | PR 1 | FE |
| 3 | `PR-03-fe-ledger-groups.md` | Income ledger groups and row state grammar | PR 2 | FE |
| 4 | `PR-04-fe-drawer-add-scope-bulk.md` | Global/group add, drawer scope preview, bulk save contract | PR 3 | FE |
| 5 | `PR-05-be-plan-comparison-read-model.md` | Expose source-plan values for income rows | PR 0 | BE |
| 6 | `PR-06-fe-plan-delta-badges.md` | Wire income plan-delta badges honestly | PR 5 + PR 3 |
| 7 | `PR-07-income-editor-e2e.md` | Income editor E2E coverage | PR 2–6 | FE/E2E |

Recommended order:

1. PR 1 first. It reduces copy-paste risk and proves expenses remain stable.
2. PR 2–4 deliver the usable income redesign from real existing data.
3. PR 5 before any plan-delta UI.
4. PR 6 only after PR 5 lands.
5. PR 7 last, after UI/API shape settles.

## Non-goals

- No income lifecycle beyond `IsActive`.
- No income category model unless product/backend requirements change.
- No future-plan creation. Current create endpoint creates month-only rows.
- No fake plan deltas or fake allocation numbers.
- No unrelated debt, savings, expense, dashboard breakdown, Docker, CI, package,
  auth, routing, or lockfile changes.
