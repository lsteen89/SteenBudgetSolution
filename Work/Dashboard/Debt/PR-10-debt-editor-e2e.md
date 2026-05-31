# PR 10 — Debt Editor E2E Coverage

| | |
| --- | --- |
| **Type** | E2E / release confidence |
| **Depends on** | PR 6-9 |
| **Blocks** | Target Debt editor release |
| **Risk** | Medium — destructive state setup and month lifecycle coverage |

## Purpose

Cover the integrated browser behavior for the target Debt editor. This feature is
financially sensitive; unit and integration tests are not enough because the
frontend must prove it does not blur balance, planned payment, lifecycle, and
month participation.

## Dependencies

- PR 6 page shell is complete.
- PR 7 add/edit flows are wired.
- PR 8 lifecycle actions are wired.
- PR 9 balance/progress UI is wired.
- Seed support exists or is extended for dedicated Debt editor users.

## E2E Scope

Add a dedicated Playwright spec for the Debt editor covering:

- page boot and summary reconciliation
- active, not-included, paid, and archived groups
- add month-only debt
- add plan-linked debt
- edit debt details with current-month scope
- edit planned monthly payment and verify balance unchanged
- update balance and verify planned payment unchanged
- skip this month and verify dashboard debt payment total decreases
- include again and verify dashboard debt payment total returns
- mark paid off and verify future materialization stops
- archive and restore
- closed month read-only behavior
- no fake progress/history when backend returns no history
- sensitive-copy smoke check for approved Swedish terms

## Files / Areas Likely Touched

- `Frontend/e2e/*debt*.spec.ts` or a new `Frontend/e2e/debts/` spec
- `Frontend/e2e/*` helpers/fixtures if existing patterns require it
- `Backend.Tools/*` or seed scripts if dedicated E2E debt data is missing
- `tests/Backend.IntegrationTests/Shared/Seeds/Budget/*` only if shared seed
  helpers are reused by E2E setup
- `Frontend/src/Pages/private/debts/*` only for stable test IDs

## Test Data Contract

Use a dedicated E2E user. Do not reuse income/expense/savings users because debt
flows are destructive and future-materialization-sensitive.

Seed at least:

- one active source-linked revolving/credit-card debt
- one active installment/loan debt
- one month-only debt candidate
- one not-included candidate
- one debt suitable for paid-off flow
- one debt suitable for archive/restore flow
- one closed/skipped month for read-only verification
- one debt with real balance history if PR 9 progress is expected to render

## Selector Contract

Add stable `data-testid` values for:

- page root
- hero payment total
- hero balance snapshot
- payment/balance strip zones
- group sections
- row action menu trigger
- add modal
- edit details modal
- planned payment modal
- balance modal
- lifecycle confirmation dialog
- progress dialog
- read-only banner

Prefer test IDs over Swedish text for destructive actions. Keep one or two copy
assertions for financial honesty terms.

## Acceptance Criteria

- E2E proves all target user flows work.
- Dashboard equation remains correct after payment edit, skip, include, add, and
  lifecycle actions.
- Balance and planned payment stay separate in visible UI and backend result.
- Closed/skipped month actions are unavailable.
- Paid/archived/skipped state comes from backend after refetch, not optimistic
  fiction.
- Progress/history is absent when backend has no history and present when seeded
  history exists.

## Tests To Add

Minimum specs:

- `debt-editor-readonly.spec.ts`
- `debt-editor-add-edit.spec.ts`
- `debt-editor-lifecycle.spec.ts`
- `debt-editor-balance-progress.spec.ts`

If suite time is too high, keep one smoke spec in PR-gated runs and mark the rest
for full project runs, but do not drop coverage entirely.

## Validation

```bash
cd Frontend
npm run test:e2e:smoke
```

Add a narrower command for the new debt spec once it exists.

## Explicit Non-Goals

- No production feature changes beyond stable selectors or missing seed support.
- No broad E2E framework rewrite.
- No assertions against mock-only designer data.
