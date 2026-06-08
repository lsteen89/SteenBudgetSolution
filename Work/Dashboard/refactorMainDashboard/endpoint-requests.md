# Endpoint Request Notes (P7)

Non-blocking endpoint/projection follow-ups discovered while implementing P0–P6
of the open-month dashboard refactor. Nothing here gates the MVP — the
dashboard ships against `GET /api/budgets/dashboard` + the existing month
status read, with all derived signals computed on-device behind named,
unit-tested helpers.

This document is the canonical answer to the handover's P7 ask. It is
intentionally scoped: it lists the gaps we actually hit, what the dashboard
currently does instead, what a future backend change would unlock, and
expected shape. It does **not** request transactions, burn rate, due dates,
or spend-progress data — those belong to a different product surface and are
explicitly out of scope per the handover (constraint 1 + P7 "Out of scope").

## Scope rules

- Requests below are *non-blocking*. Do not pause MVP delivery on them.
- Each request must stay inside planned-budget semantics. No "spent so far",
  no transaction feed, no due-date language.
- Each request, if implemented, must let the dashboard remove a *named,
  tested* client-side helper, not just shave a few computations. If the gap
  would not materially simplify the client, leave it client-side.
- Backend severity / ranking must never reintroduce shame copy on deficit.
  Existing wording rules (handover constraint 8) still apply.

## Gap status overview

| # | Gap | Client today | Backend needed for MVP? | Priority |
| --- | --- | --- | --- | --- |
| 1 | Attention feed (severity / label / action target) | `domain/budget/attentionRanking.ts` — pure, capped, unit-tested | No | Medium |
| 2 | Previous-month comparison bundle | Not displayed; dashboard intentionally avoids implying month-over-month change | No | Low |
| 3 | Expense category item population in dashboard projection | Top-N category totals only; per-category items unused on dashboard | No | Medium |
| 4 | Dashboard savings progress summary | Derived in `OpenMonthPillarWorkbench` from `liveDashboard.savings.goals` | No | Low |
| 5 | Dashboard debt summary on rich debt editor read model | Derived in `OpenMonthPillarWorkbench` from `liveDashboard.debt` rows + strategy | No | Low |

## 1. Backend-authored attention feed

### What we did instead

`Frontend/src/domain/budget/attentionRanking.ts` produces a typed, capped
(`MAX_ATTENTION_ITEMS = 3`) list of `AttentionItem`s from the existing
`DashboardSummary` + `CloseAvailability`. Severities are
`critical | attention | info | positive`. Action targets are a typed union
(`close-month`, `open-quick-drawer`, `open-full-editor`, `open-breakdown`).
Strings are i18n keys, not hardcoded copy. Ranking is unit-tested.

The `AttentionLane` organism surfaces the items behind a "How these are
chosen" affordance that names them as on-device guidance, per handover
constraint 7.

### What a backend feed would unlock

- Cross-month / cross-budget signals the dashboard cannot see in one month
  read (e.g. "subscription pressure rose vs your last 3 months").
- Centralised severity policy shared with future surfaces (email digests,
  notifications).
- Honest A/B / experimentation on ranking without shipping a frontend build.

### Suggested shape (sketch only)

```
GET /api/budgets/dashboard/attention?yearMonth=YYYY-MM
→ {
    items: AttentionItemDto[]      // already capped & sorted server-side
    generatedAtUtc: string
  }

AttentionItemDto = {
  id: string                       // stable; matches AttentionItemId today
  severity: "critical" | "attention" | "info" | "positive"
  titleKey: string                 // i18n key, never user-facing text
  bodyKey?: string
  values?: Record<string, string | number>
  action: { kind: "...", ...payload }   // mirrors AttentionActionTarget union
}
```

### Migration shape

- Keep `attentionRanking.ts` as the client fallback when the feed is empty
  or unavailable. The lane already renders calmly with `[]`.
- Promote `AttentionItemId` / `AttentionActionTarget` / `AttentionSeverity`
  to a contract module shared by both sides on adoption.

### Hard rules for the backend implementation

- Severity is descriptive of the planned-budget state, never an evaluation
  of user behaviour.
- No `dueDate`, no `spentSoFar`, no `burnRate` fields.
- Deficit copy stays factual.

## 2. Previous-month comparison bundle

### What we did instead

Nothing. The dashboard deliberately does not render
month-over-month deltas (e.g. "−420 vs May"). Comparisons would require a
second month read on dashboard load and the MVP design did not call for it.

### What a backend bundle would unlock

A single dashboard payload that includes the previous *closed* month's
snapshot totals would let us show calm, opt-in comparison chips on the
Money State anchor and pillar workbench without a second fetch round trip.

### Suggested shape (sketch only)

Extend `BudgetDashboardMonthDto`:

```
previousMonth?: {
  yearMonth: string
  status: "closed" | "skipped"
  snapshotTotals: { income, expenses, savings, debts, remaining }
}
```

### Why it stays optional

- A null or absent `previousMonth` must render without comparison UI; many
  users will be on their first or second month.
- Skipped months should be reported as such, never silently flattened to
  zero or to the prior open month.

## 3. Expense category item population in the dashboard projection

### What we did instead

The workbench surfaces the top expense categories by total only.
`liveDashboard.expenditure.categories[*].items` is empty in the dashboard
projection today (documented in `endpoint-inventory.md` § "Important Gaps").
Per-item drill-down lives in the full expense editor.

### What populating items would unlock

A denser expenses pillar that names the largest planned items
(e.g. "Rent · 12 000 / mo") without fetching the editor on dashboard render.
That keeps quick-adjust drawers honest — they remain bulk-patch only — and
the inline item list stays read-only on the dashboard.

### Suggested shape

Reuse the existing `BudgetMonthExpenseItemEditorRowDto` is overkill for the
dashboard. Prefer a thin projection:

```
liveDashboard.expenditure.categories[*].items: [{
  monthExpenseItemId: string
  name: string
  amount: decimal
}]
```

### Hard rules

- Item rows must not introduce edit affordances in the dashboard read.
  Editing lives in the full editor.
- Population must be opt-in (capped per category) to keep the dashboard
  payload bounded.

## 4. Dashboard savings progress summary

### What we did instead

`OpenMonthPillarWorkbench` derives goal progress from
`liveDashboard.savings.goals`: clamped progress bar, active-goal count,
base-saving / contribution split. No additional read is performed.

### What a dashboard-shaped summary would unlock

- Authoritative `progressPercent` per goal (clamped + rounded server-side
  to match the editor's policy exactly).
- Aggregate `totalGoalProgressPercent` for the pillar.
- A `nextCompletingGoal` hint usable by the Attention lane.

### Suggested shape

```
liveDashboard.savings.progress?: {
  activeGoalCount: number
  totalSavedAmount: decimal
  totalTargetAmount: decimal
  totalProgressPercent: decimal       // clamped 0..100 server-side
  nextCompletingGoalId?: string
}
```

### Migration shape

Keep client clamping as a defensive fallback when `progress` is absent.

## 5. Dashboard debt summary from the rich editor read model

### What we did instead

`OpenMonthPillarWorkbench` derives the debts pillar from
`liveDashboard.debt`: total balance, total monthly payment, strategy chip
(avalanche / snowball / noAction / unknown). It does *not* fetch
`/months/{yearMonth}/debt-editor` on dashboard render — that endpoint stays
behind the full editor route only.

### What a dashboard-shaped debt summary would unlock

A small, projection-friendly subset of the editor's hero/summary, scoped
for read-only dashboard display:

```
liveDashboard.debt.summary?: {
  participationCount: number          // debts included this month
  totalPlannedPayment: decimal
  totalRemainingBalance: decimal
  strategy: "avalanche" | "snowball" | "noAction" | "unknown"
  highestPriorityDebtId?: string      // strategy-aware
}
```

### Hard rules

- No lifecycle controls inferred from the dashboard payload. Mark paid off,
  archive, restore, balance adjustment etc. remain editor-only.
- `participationCount` must not silently exclude debts the user skipped this
  month; surface them as participation = false, not missing.

## Explicitly NOT requested

Per handover P7 "Out of scope" + constraint 1, the following are **not**
endpoint requests and must not be added to this list:

- Transaction feeds or bank-import endpoints.
- "Spent so far" / "remaining to spend" per category.
- Weekly or daily burn rate.
- Bill / debt due dates and calendars.
- Historical trend series.
- Backend-authored financial advice or coaching copy.

If a future product surface needs any of these, that is a separate
investigation, not an extension of this dashboard refactor.

## Definition of done for this PR

- This document exists under `Work/Dashboard/refactorMainDashboard/`.
- No backend or DTO change is shipped as part of P7.
- No frontend change is shipped as part of P7.
- The MVP dashboard remains correct and complete without any of the
  requests above being acted on.
