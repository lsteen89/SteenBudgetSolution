# Money-Flow Editor UX Alignment

Internal UX contract for editable money-flow areas: expenses, income, savings, and debts.

## Purpose

Money-flow editors must feel like one product system. Expenses are the canonical template because that editor established the full page, modal, quick drawer, scope, and bulk-save patterns.

Income may differ in domain language and valid fields, but it should not introduce a second editor design. Savings and debts should follow the same system when they become editable.

## Core Rules

1. The expense editor is the template.
2. The current open month is editable.
3. Closed and skipped months are read-only.
4. Domain-specific differences are allowed only when the data model requires them.
5. Layout, action placement, scope behavior, and interaction rhythm should stay consistent.
6. Do not promise future-plan behavior unless it is real end to end.

## Dashboard Pillars

Each editable dashboard pillar should use the same visual rhythm:

- headline area with title, status badge, amount, and short description
- optional calm detail strip when useful real data exists
- aligned action row at the bottom
- one clear primary direction per surface

Income and expenses may both show detail strips, but the strip must contain real information. Do not add fake legends or filler just to balance card height.

CTA hierarchy:

- quick action is secondary and lightweight
- full editor action is the stronger planning path
- not every card should be a loud green CTA
- unavailable savings/debt actions should stay clearly unavailable or coming soon, not green

## Quick Drawers

Quick drawers are for fast current-month edits only.

Expected behavior:

- show editable rows for the open month
- save only current-month changes
- do not show scope cards
- do not expose future-plan toggles
- include calm copy that says the change affects only the current month
- include a secondary route to the full editor/planning view when future-plan changes are needed

Do not use active checkboxes or switches in a quick drawer unless the action is unmistakable and current-month-only. If the user might read it as delete, disable, or future-plan behavior, leave it out.

## Full Editor Pages

The full editor page should mirror the expense editor:

- same hero/header shape
- same period card placement
- same math strip treatment
- same ledger/list density
- same row action placement
- same burger/action-menu pattern
- same add button placement
- same empty-state rhythm

Rows should use an action menu instead of ad hoc pencil/trash buttons. The user should learn one editing grammar and reuse it across money-flow areas.

## Create Modals

Create modals should mirror the expense modal shell:

- same modal width and header rhythm
- same field spacing
- same validation display
- same close button placement
- same footer button placement

Create mode should hide scope cards if creation only supports the current month. Use honest copy such as:

- `Gäller bara {month}`
- `Den här posten läggs bara till i {month}.`

Do not imply future-plan creation until the backend and data model support it cleanly.

## Edit Modals

Edit modals should mirror the expense modal:

- same modal shell
- same footer placement
- same save/cancel behavior
- same disabled state treatment
- same scope-card section when scope choices are valid

Show the three scope choices only when the row has a budget-plan source link. For month-only rows, disable or hide future-plan options and explain calmly that the row only exists in this month.

## Scope Cards

Use the same user-facing scope language across editors:

- `Gäller bara {month}`
- `Uppdatera budgetplanen framåt`
- `Endast budgetplanen framåt`

Meaning:

- current month only updates only the month row
- current month and future plan updates the month row and the linked plan row
- future plan only updates the linked plan row and leaves the current month row unchanged

Budget-plan scopes must fail or be disabled for month-only rows with no source link.

## Copy Rules

Do not expose implementation terms in user copy:

- no `default`
- no `baseline`
- no `foundation`

Avoid fake coach language, guilt language, and noisy warnings. Warn only when the user is about to do something permanent or hard to undo.

Use domain language, but keep the same interaction model. Example: income can say income sources; expenses can say subscriptions or categories. The shell should still feel shared.

## Technical Guardrails

Frontend:

- no `Promise.all` fake bulk saves for editor bulk PATCH behavior
- quick drawers must only send current-month mutations
- full editors must call the correct single or real bulk mutation
- closed and skipped months must not expose edit affordances
- plan-scope options must be disabled or hidden for month-only rows

Backend:

- bulk PATCH must be real transactional bulk
- one failed row must roll back the full bulk request
- audit events should be written for every changed row
- plan scopes require a clean source link in the domain model

If a future domain cannot support the expense editor contract cleanly yet, keep the UI honest and defer the unsupported path.
