# PR 4 — Income Drawer, Add Modes, Scope Preview, And Bulk Save

## Goal

Bring create/edit behavior in line with the approved drawer grammar and real
backend mutation model.

## Scope

Frontend only.

Likely files:

- `Frontend/src/Pages/private/income/IncomeEditorPage.tsx`
- `Frontend/src/Pages/private/income/components/IncomeItemModal.tsx`
- `Frontend/src/Pages/private/income/components/DeleteIncomeItemDialog.tsx`
- income i18n dictionaries/tests

## Add Modes

Global `Lägg till inkomst`:

- opens create drawer with type selector
- user chooses household or side income
- copy:
  `Välj typ av inkomst och fyll i beloppet. Skapas bara i {månad}.`

Group `Lägg till`:

- opens create drawer with type preselected
- hides type selector
- copy:
  `Skapas bara i {månad}. Du kan lägga till den i planen efteråt.`

Create remains month-only.

## Drawer Order

1. fields
2. active/month status
3. scope when applicable
4. live preview
5. footer

Footer has only:

- `Avbryt`
- `Spara`

## Salary Rules

- amount editable
- name disabled with:
  `Namnet på din lön kan inte ändras.`
- active toggle shown disabled/locked with:
  `Din lön är alltid aktiv.`
- no scope cards
- cannot delete
- row kebab has only `Redigera`

## Scope Rules

Plan-linked side/household rows show:

- `Bara denna månad` => `currentMonthOnly`
- `Denna månad + planen framåt` => `currentMonthAndBudgetPlan`
- `Bara planen framåt` => `budgetPlanOnly`

Month-only rows force current-month-only behavior and disable plan scopes with:

```text
Inte tillgängligt — den här raden finns inte i planen.
```

Do not offer plan-writing scopes when:

- `sourceIncomeItemId == null`
- `canUpdateDefault == false`
- row is salary

## Live Preview

Preview labels:

- `Förhandsvisning`
- `{månad} {år} — total inkomst`
- `Budgetplanen framåt`

Preview must be honest:

- current-month preview can use current editor rows plus form delta
- future-plan preview can only show the intended request direction, not a fake
  full future total unless the backend returns enough source-plan data
- positive income delta is green/neutral
- red only for destructive actions

## Bulk Save Requirement

When the redesigned UI saves multiple row edits together, use
`usePatchBudgetMonthIncomeItemsBulk`.

Do not fake bulk behavior with N single `PATCH` calls. The backend bulk patch
is transactional and must remain the frontend contract for multi-row save.

Single-row drawer saves may keep using the single-row patch hook.

## Delete Copy

Delete side/household rows as:

```text
Ta bort från {månad}
```

Never imply deletion from the plan.

## Acceptance Criteria

- Global and group add behave differently.
- Create payloads are month-only.
- Salary restrictions are visible and enforced.
- Scope cards appear only where meaningful.
- Drawer footer contains only `Avbryt` and `Spara`.
- Destructive actions stay out of the drawer footer.
- No banned implementation/lifecycle words appear.

## Validation

- Update `IncomeItemModal.test.tsx`.
- Add tests for global vs group create behavior.
- Add tests for salary restrictions and scope gating.
- Run focused income tests.
- `cd Frontend && npm run build`
- Manual browser pass for create/edit/delete/read-only states.
