# PR 4 — Subscription lifecycle controls

| | |
| --- | --- |
| **Type** | Frontend behavior/UI |
| **Depends on** | PR 2 |
| **Blocks** | PR 7 |
| **Risk** | Medium — total inclusion semantics must be clear |

---

## 1. Why this PR exists

The backend already supports subscription lifecycle:

- `active`
- `paused`
- `cancelled`

Dashboard totals include subscription rows only when lifecycle is `null` or
`active`. Paused/cancelled subscriptions are excluded. The current UI mostly
uses generic `isActive`, so subscription-specific behavior is hidden.

This PR exposes lifecycle controls only for subscription rows.

## 2. Backend contract

Existing patch payload:

```ts
{
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
  subscriptionLifecycleStatus?: "active" | "paused" | "cancelled" | null;
  updateDefault: boolean;
  scope?: ExpenseEditScope;
}
```

Backend rules:

- lifecycle status is valid only for subscription category rows.
- non-subscription rows must send `subscriptionLifecycleStatus = null`.
- changing a row category away from subscription clears lifecycle server-side.
- changing a row category to subscription defaults lifecycle to `active` if no
  supported lifecycle already exists.

## 3. Implementation

Row actions:

- For subscription rows, action menu should offer lifecycle actions:
  - activate/reactivate
  - pause
  - cancel
- For non-subscription rows, keep generic active/inactive action.
- Do not show inline lifecycle segmented controls by default. The prototype has
  an inline/menu toggle; production should start with menu placement to keep the
  ledger calm.

Modal:

- When selected category is subscription, show a lifecycle section.
- When selected category is not subscription, hide lifecycle controls and submit
  `null`.
- Lifecycle copy must say paused/cancelled subscriptions do not count in this
  month's total.

Mutation:

- lifecycle menu actions call existing single-row patch with:
  - current row name/category/amount/isActive
  - changed `subscriptionLifecycleStatus`
  - `scope: currentMonthOnly`
  - `updateDefault: false`
- For activate from paused/cancelled, set lifecycle `active`.
- Do not call delete for pause/cancel.

## 4. Acceptance criteria

- Subscription rows visibly show active/paused/cancelled state.
- Paused/cancelled subscriptions are grouped below active rows or clearly marked.
- Lifecycle controls are available only for subscription rows.
- Non-subscription rows never send subscription lifecycle values.
- Lifecycle updates use existing patch endpoint.
- Totals and row labels make it clear paused/cancelled rows do not count.

## 5. Validation

Run:

```bash
cd Frontend
npm run build
npx vitest run Expenses
```

Add tests for:

- subscription lifecycle action payloads
- non-subscription lifecycle payload is null
- paused/cancelled subscription excluded from group totals

Browser pass:

- pause subscription
- reactivate subscription
- cancel subscription
- change category from subscription to non-subscription
- change category from non-subscription to subscription

## 6. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
