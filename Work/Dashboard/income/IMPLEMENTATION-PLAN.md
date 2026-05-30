# Income Editor — Implementation Plan

Use this as the execution checklist. Implement one PR file at a time, validate,
append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, then stop.

## Objectives

1. Make income read as the top of the budget funnel.
2. Reuse the completed expenses grammar through shared editor primitives.
3. Keep every number financially honest and backend-backed.
4. Respect income's real model: no categories, no subscription lifecycle,
   create is month-only.
5. Hide edit affordances for read-only months.
6. Gate plan deltas on backend source-plan fields.

## PR Queue

| PR | File | Objective | Depends on |
| --- | --- | --- | --- |
| 0 | `PR-00-source-analysis.md` | Real source analysis and implementation contract | done |
| 1 | `PR-01-fe-shared-editor-foundation.md` | Extract shared money-flow editor primitives, expenses unchanged | PR 0 |
| 2 | `PR-02-fe-hero-allocation-strip.md` | Income hero and real distribution equation | PR 1 |
| 3 | `PR-03-fe-ledger-groups.md` | Three-group ledger, quiet rows, inactive subsection | PR 2 |
| 4 | `PR-04-fe-drawer-add-scope-bulk.md` | Global/group add, drawer order, salary rules, scope preview | PR 3 |
| 5 | `PR-05-be-plan-comparison-read-model.md` | Backend source-plan comparison fields | PR 0 |
| 6 | `PR-06-fe-plan-delta-badges.md` | Render `Ändrad i {månad}` from real backend fields | PR 5 + PR 3 |
| 7 | `PR-07-income-editor-e2e.md` | E2E coverage for redesigned editor | PR 2-6 |

## Recommended Order

Build in this order:

1. PR 1
2. PR 2
3. PR 3
4. PR 4
5. PR 5
6. PR 6
7. PR 7

Reason: PR 1-4 deliver the usable redesign from existing data. PR 5-6 then
add honest plan deltas. PR 7 waits until the UI/API shape settles.

## Cross-PR Rules

- No user-facing copy may say `baseline`, `default`, `source`,
  `linked row`, `paused`, `cancelled`, or `subscription`.
- Use `Sidoinkomst`, not `Sidointäkt`.
- Use `Fritt kvar` consistently.
- Carry-over is never income.
- Positive income changes are green/positive, not red.
- Red is destructive only.
- Normal plan-linked rows show no `Plan` pill.
- `Ändrad i {månad}` is forbidden before PR 5/6.
- Multi-row saves use the transactional bulk patch hook.
- Read-only months expose no add/edit/delete/toggle/save affordances.

## Validation Baseline

Frontend PRs:

```bash
cd Frontend
npx vitest run src/Pages/private/income
npm run build
```

Run expense tests as well for PR 1 because it touches shared primitives:

```bash
cd Frontend
npx vitest run src/Pages/private/expenses
```

Backend PR:

```bash
dotnet build
```

Then run the narrow backend integration test command for the income editor
tests once the exact test filter is known from the existing test names.

E2E PR:

```bash
cd Frontend
npm run test:e2e:smoke
```

Use a narrower Playwright command for the new income spec if one exists.
