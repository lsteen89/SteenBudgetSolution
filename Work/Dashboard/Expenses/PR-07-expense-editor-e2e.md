# PR 7 — Expense editor E2E coverage

| | |
| --- | --- |
| **Type** | Playwright E2E |
| **Depends on** | PR 1–6 |
| **Blocks** | Nothing |
| **Risk** | Medium — seeded data and selectors must be stable |

---

## 1. Why this PR exists

The redesign changes the main expense workflow. It needs browser coverage that
locks the actual user flows, not just component snapshots.

This PR should be authored after PR 1–6 are in the working tree so selectors,
copy, and endpoint behavior are stable.

## 2. Existing E2E patterns

Inspect:

- `Frontend/e2e/`
- savings E2E specs
- dashboard close-month specs
- test seeding docs in `docs/local-seeding-playbook.md`

Use existing app login/seed helpers. Do not invent a second Playwright harness.

## 3. Test coverage

Add a focused expense editor spec covering:

1. Page loads open month.
   - hero visible
   - balance strip visible
   - ledger groups visible
2. Create expense.
   - open create modal
   - month-only callout visible
   - fill name/category/amount
   - save
   - row appears
3. Edit linked row current month only.
   - scope current month only
   - amount changes
   - balance/total updates
4. Edit linked row budget plan only.
   - current month preview says unchanged
   - save
   - current month row remains unchanged
5. Month-only row scope behavior.
   - plan scopes hidden/disabled
6. Subscription lifecycle.
   - pause subscription
   - total excludes it
   - reactivate subscription
   - total includes it again
7. Delete current month row.
   - delete confirmation
   - row removed/soft-deleted from visible ledger

If PR 6 is not implemented, skip plan-delta assertions and cover only current
available behavior. Do not assert fake plan comparison.

## 4. Selectors

Prefer stable testids for:

- hero total
- balance terms
- group cards
- row action menu
- modal form
- scope cards
- subscription lifecycle actions

If testids are missing, add them in the production components as part of this
PR. Keep them semantic, not layout-coupled.

## 5. Acceptance criteria

- E2E covers the core expense editor workflow.
- Tests run against seeded data.
- Selectors are stable and not tied to Swedish-only copy where avoidable.
- No production behavior changes except adding testids if needed.

## 6. Validation

Run the narrow spec first:

```bash
cd Frontend
npm run test:e2e -- expenses
```

Then run the smoke suite if time permits:

```bash
cd Frontend
npm run test:e2e:smoke
```

If the local DB/backend setup is unavailable, state exactly what could not run
and why.

## 7. Wrap-up

Append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, stop.
