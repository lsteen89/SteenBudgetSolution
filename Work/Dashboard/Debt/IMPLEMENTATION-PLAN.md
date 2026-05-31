# Debt Editor — Target Implementation Plan

Use this as the execution checklist. Implement one PR file at a time, validate,
append `docs/ai/ai-changelog.md`, write `COMMIT_MSG.tmp`, then stop.

## Objectives

1. Build backend support for a full Debt editor before shipping target UI.
2. Keep planned payment, actual payment, balance, lifecycle, and participation
   separate.
3. Preserve closed/skipped budget month immutability.
4. Preserve dashboard and month-close totals:
   `income + carry-over - expenses - savings - debt payments = remaining`.
5. Make balance changes auditable.
6. Let paid-off and archived debts stop future materialization without losing
   historical month rows.
7. Keep Debt UX neutral and non-judgmental.

## PR Queue

| PR | File | Objective | Depends on |
| --- | --- | --- | --- |
| 0 | `PR-00-source-analysis.md` | Current reality and target contract | done |
| 1 | `PR-01-be-debt-lifecycle-participation-model.md` | Add lifecycle and month participation schema/model | PR 0 |
| 1.5 | `PR-01.5-be-debt-seed-and-guard-hardening.md` | Clean active-dev seeds and harden PR 1 mutation/read gaps | PR 1 |
| 2 | `PR-02-be-debt-create-edit-metadata.md` | Add source/month debt create and edit metadata endpoints | PR 1.5 |
| 3 | `PR-03-be-debt-balance-adjustment-audit.md` | Add balance adjustment command and debt history | PR 1.5 |
| 4 | `PR-04-be-debt-lifecycle-actions.md` | Add paid-off, archive, restore, skip, remove commands | PR 1.5 + PR 3 |
| 5 | `PR-05-be-debt-editor-read-model.md` | Expose target editor read model and action permissions | PR 1.5-4 |
| 6 | `PR-06-fe-debt-target-page-shell.md` | Build target page shell from real read model | PR 5 |
| 7 | `PR-07-fe-debt-add-edit-flows.md` | Wire add/edit metadata flows | PR 2 + PR 5 + PR 6 |
| 8 | `PR-08-fe-debt-lifecycle-actions.md` | Wire paid/archive/restore/skip/remove actions | PR 4 + PR 5 + PR 6 |
| 9 | `PR-09-fe-debt-balance-progress.md` | Wire balance update and repayment progress UI | PR 3 + PR 5 + PR 6 |
| 10 | `PR-10-debt-editor-e2e.md` | Add browser coverage for target Debt editor | PR 6-9 |

## Recommended Order

Build backend first:

1. PR 1 establishes the vocabulary and database invariants.
2. PR 1.5 hardens PR 1 while the schema is still active-development only:
   seed data uses the new lifecycle vocabulary directly, wizard materialization
   is verified, bulk patch guards match single patch guards, and default editor
   reads hide removed rows by participation rather than legacy deletion alone.
   Use `PR-01.5-start-prompt.md` to launch the implementation session.
3. PR 2 adds creation and metadata editing without balance/lifecycle actions.
4. PR 3 adds balance history before paid-off/progress claims exist.
5. PR 4 adds lifecycle actions against the model from PR 1.5 and audit from PR 3.
6. PR 5 exposes one read model the designer/frontend can trust.

Then build frontend:

7. PR 6 renders the target page shell from PR 5 data.
8. PR 7 wires add/edit detail forms.
9. PR 8 wires lifecycle actions.
10. PR 9 wires balance update/progress.
11. PR 10 covers the full browser flow.

## Cross-PR Rules

- `MonthlyPayment` is planned outflow.
- `Balance` is liability.
- Balance updates are explicit and auditable.
- Paid-off is lifecycle, not proof of a payment.
- Skip/not-included is month participation, not source lifecycle.
- Payment totals count included month rows only.
- Liability balance can include active debts that are not included this month.
- Closed/skipped budget months expose no mutation affordances.
- Source-linked actions must preserve `SourceDebtId` for historical deltas.
- Hard delete is forbidden for rows with source/history.
- Frontend must not infer paid/archived/skipped state from labels or zero
  payment.

## Validation Baseline

Docs-only PR:

```bash
git status --short --untracked-files=all Work/Dashboard/Debt
rg -n "MonthlyPayment|Balance|paidOff|notIncluded|archived|deleted" Work/Dashboard/Debt
```

Backend PRs:

```bash
dotnet build
dotnet test tests/Backend.UnitTests --filter Debt
dotnet test tests/Backend.IntegrationTests --filter BudgetMonthDebt
```

Frontend PRs:

```bash
cd Frontend
npx vitest run src/Pages/private/debts src/utils/i18n/pages/private/debts
npm run build
```

E2E PR:

```bash
cd Frontend
npm run test:e2e:smoke
```

Add narrower Playwright commands for the new debt spec once selectors exist.
