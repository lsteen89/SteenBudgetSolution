# PR 2 — Grouped ledger polish + row state model

| | |
| --- | --- |
| **Type** | Frontend UI |
| **Depends on** | PR 1 |
| **Blocks** | PR 3, PR 4, PR 6, PR 7 |
| **Risk** | Medium — dense row UI and grouping logic |

---

## 1. Why this PR exists

The existing ledger is functionally correct but visually flat. The prototype
keeps a dense ledger, but group headers and row states carry more meaning:
active count, paused count, largest item, month-only state, plan-linked state,
and inactive rows separated from active rows.

This PR refines the ledger. It does not alter modal behavior.

## 2. Source design

Prototype sections:

- `.group-card`
- `.group-head`
- `.row`
- inactive sublabel: `Inaktiverade`
- subscription disabled sublabel: `Avstängda`

Current files:

- `Frontend/src/Pages/private/expenses/components/ExpensesLedgerSection.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpenseLedgerRow.tsx`
- `Frontend/src/Pages/private/expenses/components/ExpenseRowActionsMenu.tsx`
- `Frontend/src/Pages/private/expenses/utils/buildExpenseLedgerGroups.ts`
- `Frontend/src/Pages/private/expenses/types/expenseEditor.types.ts`

## 3. Implementation

Extend the expense ledger view model.

Recommended group fields:

- `activeRows`
- `inactiveRows`
- `activeTotal`
- `inactiveTotal`
- `activeCount`
- `inactiveCount`
- `monthOnlyCount`
- `largestActiveRow`

Recommended row fields:

- `state`: `active | inactive | subscriptionPaused | subscriptionCancelled`
- `isSubscription`
- `countsInMonthlyTotal`
- `sourceKind`: `monthOnly | planLinked`

Use current data only:

- inactive: `isActive === false`
- subscription paused/cancelled:
  `categoryKey === "subscription"` and lifecycle is `paused`/`cancelled`
- counts in totals:
  `!isDeleted && isActive && (lifecycle == null || lifecycle === "active")`

Do not invent plan deltas yet. PR 6 wires those after backend support.

## 4. UI behavior

Group header:

- group title
- total active amount
- active row count
- inactive/paused count where relevant
- largest active item insight if present
- group-level add button preselects the matching category where feasible

Rows:

- keep action-menu grammar.
- money aligned with tabular numerals.
- active rows first, inactive rows below a sublabel.
- month-only rows get a quiet `Only this month` pill.
- plan-linked rows do not need a badge by default. The prototype explicitly
  treats plan badges as optional; avoid visual noise.
- inactive rows must clearly say they do not count in the current month total.

Action menu:

- edit
- pause/resume or activate/deactivate current month
- delete from current month

Copy must avoid `default`, `baseline`, and implementation terms.

## 5. Acceptance criteria

- Groups show useful summary metadata.
- Active/inactive rows are visually distinct.
- Inactive rows are not included in group totals.
- Subscription paused/cancelled rows are excluded from active totals.
- Row action placement remains consistent.
- No backend changes.

## 6. Validation

Run:

```bash
cd Frontend
npm run build
npx vitest run buildExpenseLedgerGroups
```

Add tests for:

- fixed/variable/subscription grouping
- inactive rows excluded from totals
- paused/cancelled subscriptions excluded from totals
- month-only and plan-linked source kind mapping

Browser pass:

- desktop and mobile `/dashboard/expenses`
- menu open/close behavior

## 7. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
