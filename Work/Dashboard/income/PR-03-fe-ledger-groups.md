# PR 3 — Income Ledger Groups And Row States

## Goal

Move income from one flat list into the approved three-group ledger:

1. `Lön`
2. `Hushållsinkomst`
3. `Sidoinkomst`

Rows should be quiet by default, with exception labels only when they mean
something.

## Scope

Frontend only.

Likely files:

- `Frontend/src/Pages/private/income/components/IncomeLedgerSection.tsx`
- new income group/row components
- new income group VM utility
- income i18n dictionaries/tests

## Group Rules

Group descriptions:

- `Lön`: `Din återkommande huvudsakliga inkomst.`
- `Hushållsinkomst`: `Inkomster från hushållet som räknas in i budgeten.`
- `Sidoinkomst`: `Extra inkomster som kan variera mellan månader.`

Header content:

- title
- active/inactive count
- right-aligned monthly total with `Per månad`
- group-level `Lägg till` when editable and group can create rows
- description line

Use `Sidoinkomst`, not `Sidointäkt`.

## Row Rules

Layout:

- name left
- plain secondary meta under name
- tabular amount right
- kebab far right when editable

Normal plan-linked rows show no pill.

Allowed exception pills:

- `Bara {månad}` for month-only rows
- `Inaktiv denna månad` for inactive month rows

Do not show `Ändrad i {månad}` until PR 6, after PR 5 backend fields exist.

Do not show:

- `Plan`
- `Pausad`
- `Avbruten`
- subscription lifecycle labels

## Inactive Subsection

Inactive rows stay visible by default in their group, after active rows:

```text
Inaktiva — räknas inte i totalen för {månad}
```

Inactive rows do not count in group totals.

## Actions

Use existing/shared row menu patterns.

- salary: `Redigera` only
- active side/household: `Redigera`, `Inaktivera denna månad`, `Ta bort från {månad}`
- inactive side/household: `Redigera`, `Aktivera för {månad}`, `Ta bort från {månad}`
- read-only: no actionable menu

Destructive actions stay in the kebab.

## Acceptance Criteria

- Groups render in the approved order.
- Group totals match backend counting rules:
  salary plus active, non-deleted side/household rows.
- Inactive rows are visible but visually quiet.
- Month-only rows show `Bara {månad}`.
- No `Plan` pill or lifecycle language appears.
- Empty group states are calm and include one add action only when editable.

## Validation

- Add utility tests for grouping, totals, inactive placement, and exception
  labels.
- Add/extend income ledger component tests.
- Run focused income tests.
- `cd Frontend && npm run build`
- Manual browser check at desktop and mobile.
