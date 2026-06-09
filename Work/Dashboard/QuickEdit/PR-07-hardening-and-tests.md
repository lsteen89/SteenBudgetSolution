# PR 7 - Quick Edit Hardening And Tests (PR G)

| | |
| --- | --- |
| **Type** | Frontend tests / cleanup |
| **Depends on** | PR A, PR B, PR C, PR D, PR E, PR F |
| **Blocks** | Merge-readiness review |
| **Risk** | Low: test and cleanup focused |

## 1. Purpose

Close the Quick Edit implementation queue with hardening coverage.

This PR does not add product behavior. It verifies the behavior already added
across PR A-F and removes branch debris that should not ship.

## 2. Included scope

- Keep projection math covered by unit tests.
- Keep drawer tab switching, lazy mounting, active-tab save, and dirty-draft
  behavior covered by drawer tests.
- Keep domain read-only and validation states covered by panel tests.
- Add one Playwright smoke path for a happy-path quick edit save.
- Remove accidental files that are not part of the feature branch.

## 3. Acceptance criteria

- `quickEditProjection` tests pass.
- `EditPeriodDrawer` tests pass.
- Expenses, income, and savings panel tests pass.
- The smoke suite contains a real quick-edit save round-trip, not only a
  drawer-open test.
- No accidental root files are left in the branch.
- No production behavior changes are included.

## 4. Validation

Expected focused frontend validation from `Frontend/`:

```bash
npm run test:run -- EditPeriodDrawer quickEditProjection IncomePanel SavingsPanel ExpensesPanel.scope
npm run test:e2e:smoke -- dashboard-polish.spec.ts
```

If the smoke command is too expensive or the E2E environment is unavailable,
report that explicitly and do not imply it passed.

