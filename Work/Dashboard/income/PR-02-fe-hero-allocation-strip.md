# PR 2 — Income Hero And Distribution Strip

## Goal

Replace the current income header with the approved income top-funnel framing:

```text
inkomst + överskott från förra månaden - utgifter - sparande - skulder = fritt kvar
```

Use the shared money-flow primitives from PR 1.

## Scope

Frontend only.

Likely files:

- `Frontend/src/Pages/private/income/IncomeEditorPage.tsx`
- new income hero component
- new income distribution strip component
- income i18n dictionaries/tests
- income math/summary utility tests

Do not change backend code in this PR.

## Data Contract

Use only real existing data:

- income rows from `useBudgetMonthIncomeItems`
- dashboard data from `useBudgetDashboardMonthQuery`
- aggregate helpers such as `buildDashboardSummaryAggregate`
- month status data from `useBudgetMonthsStatusQuery`

Every displayed term must reconcile:

```text
income + carryOver - expenses - savings - debts = remaining
```

Carry-over is separate from income.

If any required term is not exposed by existing dashboard data, stop and
document the missing field. Do not fabricate it.

## Hero Requirements

- eyebrow: `Inkomst · {månad}`
- headline: `Du planerar {totalInkomst} i inkomst denna månad`
- split line:
  `{lön} lön · {hushåll} hushåll · {sidoinkomst} sidoinkomst · {frittKvar} fritt kvar`
- global add button: `Lägg till inkomst`
- income MoM delta only if backed by real previous-month data
- income increase reads green/positive
- read-only marker when applicable
- compact height

## Distribution Strip Requirements

- title: `Månadens fördelning`
- headline: `{frittKvar} fritt kvar`
- status chip:
  - calm positive when available money covers committed outflows
  - calm warn when committed outflows exceed available money
- explanation:
  `Så här fördelas inkomsten den här månaden — utgifter, sparande och skulder först, resten är fritt kvar.`
- breakdown terms:
  `Inkomst`, `Överskott från {förra månaden}`, `Utgifter`, `Sparande`, `Skulder`, `Fritt kvar`
- proportional bar segments:
  `Utgifter`, `Sparande`, `Skulder`, `Fritt kvar`
- clear gaps between bar segments
- zero terms still show as `0 kr` in the breakdown

## Read-Only Behavior

Closed/skipped/read-only months must hide:

- global add button
- group add buttons if already present from current code
- edit/delete affordances if visible in touched surface

Backend rejection is not enough; the UI must not offer dead controls.

## Acceptance Criteria

- Hero and strip match expenses as siblings, not as copy-paste.
- The equation reconciles from real dashboard totals.
- No fake savings/debt/carry-over/MoM numbers.
- `Fritt kvar` wording is consistent.
- Loading state does not flash fake zero totals.
- No `baseline`, `default`, `source`, `paused`, or lifecycle words in copy.

## Validation

- Add/extend focused tests for income summary math.
- Run focused income tests.
- `cd Frontend && npm run build`
- Manual browser check on `/dashboard/income` at desktop and mobile.
